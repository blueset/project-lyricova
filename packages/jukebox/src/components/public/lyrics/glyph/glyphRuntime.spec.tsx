import { renderHook, act, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const initGlyphRuntime = vi.fn(async (..._args: unknown[]) => undefined);
const createGlyphShaper = vi.fn();
const layoutRubyParagraph = vi.fn();
const ensureFontsFor = vi.fn();
const escalateFallback = vi.fn();
const hasUnregisteredCoverageFor = vi.fn();
let freeShaper = vi.fn();

vi.mock("./fontLoader", () => ({
  initGlyphRuntime: (...args: unknown[]) => initGlyphRuntime(...args),
  createGlyphShaper: () => createGlyphShaper(),
}));
vi.mock("./glyphFontManager", () => ({
  GlyphFontManager: class {
    ensureFontsFor = ensureFontsFor;
    escalateFallback = escalateFallback;
    hasUnregisteredCoverageFor = hasUnregisteredCoverageFor;
  },
}));
vi.mock("./rubyLayout", () => ({
  layoutRubyParagraph: (...args: unknown[]) => layoutRubyParagraph(...args),
}));

const { useCreateGlyphRuntime } = await import("./glyphRuntime");

/**
 * Mimics the real engine: when an anchor is supplied it is echoed back verbatim
 * as `rubyMetrics`, while `naturalRubyMetrics` always reports what the
 * paragraph's own fonts need. A mock that returns `null` for both once an anchor
 * is set cannot catch a runtime that widens from the wrong field.
 */
function echoingLayout(natural: Record<string, number> | null) {
  return (_shaper: unknown, request: Record<string, unknown>) =>
    layoutResult({
      rubyMetrics: (request.rubyMetrics as unknown) ?? natural,
      naturalRubyMetrics: natural,
    });
}

function layoutResult(overrides: Record<string, unknown> = {}) {
  return {
    lines: [],
    height: 10,
    width: 20,
    baseDirection: "ltr",
    rubyRow: { height: 0, baseline: 0, fontSize: 10 },
    rubyMetrics: null,
    naturalRubyMetrics: null,
    rubies: [],
    issues: [],
    missingFontRanges: [],
    ...overrides,
  };
}

function request(overrides: Record<string, unknown> = {}) {
  return {
    lineIndex: 0,
    text: "hello",
    furigana: [],
    fontSize: 32,
    maxWidth: 400,
    reserveRubyRow: false,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  freeShaper = vi.fn();
  createGlyphShaper.mockReturnValue({
    glyphOutline: vi.fn(() => null),
    free: freeShaper,
  });
  ensureFontsFor.mockResolvedValue({
    fontIds: [1],
    fontManifestIds: ["latin"],
  });
  escalateFallback.mockResolvedValue({
    fontIds: [1, 2],
    fontManifestIds: ["latin", "han"],
  });
  hasUnregisteredCoverageFor.mockResolvedValue(false);
  layoutRubyParagraph.mockReturnValue(layoutResult());
});

async function readyRuntime() {
  const hook = renderHook(() => useCreateGlyphRuntime());
  await waitFor(() => expect(hook.result.current.status).toBe("ready"));
  return hook;
}

describe("useCreateGlyphRuntime", () => {
  it("initializes the WASM runtime exactly once for many consumers", async () => {
    const { result } = await readyRuntime();
    expect(initGlyphRuntime).toHaveBeenCalledTimes(1);
    expect(createGlyphShaper).toHaveBeenCalledTimes(1);
    expect(result.current.shaper).not.toBeNull();
    expect(result.current.pathCache).not.toBeNull();
  });

  it("surfaces a fatal init failure instead of pretending to be ready", async () => {
    initGlyphRuntime.mockRejectedValueOnce(new Error("no wasm"));
    const { result } = renderHook(() => useCreateGlyphRuntime());
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.error).toBe("no wasm");
    expect(result.current.shaper).toBeNull();
  });

  it("returns null on the first selection miss, then resolves once and notifies", async () => {
    const { result } = await readyRuntime();
    const listener = vi.fn();
    act(() => {
      result.current.subscribe(listener);
    });

    const first = result.current.selectionFor("abc");
    expect(first).toBeNull();

    await waitFor(() => expect(listener).toHaveBeenCalled());
    expect(result.current.selectionFor("abc")).toEqual({
      fontIds: [1],
      fontManifestIds: ["latin"],
    });
    // Cached: the manager is not consulted again for the same text.
    expect(ensureFontsFor).toHaveBeenCalledTimes(1);
  });

  it("dedupes concurrent requests for the same text", async () => {
    const { result } = await readyRuntime();
    result.current.selectionFor("abc");
    result.current.selectionFor("abc");
    result.current.selectionFor("abc");
    await waitFor(() => expect(ensureFontsFor).toHaveBeenCalledTimes(1));
  });

  it("falls back to the whole chain when coverage selection throws", async () => {
    ensureFontsFor.mockRejectedValueOnce(new Error("coverage down"));
    const { result } = await readyRuntime();
    result.current.selectionFor("abc");
    await waitFor(() =>
      expect(result.current.selectionFor("abc")).toEqual({
        fontIds: [1, 2],
        fontManifestIds: ["latin", "han"],
      }),
    );
    // A transient coverage outage must not become a fatal error.
    expect(result.current.status).toBe("ready");
  });

  it("probes for a base font when a line's coverage selection is empty", async () => {
    ensureFontsFor.mockImplementation(async (text: string) =>
      text === " "
        ? { fontIds: [9], fontManifestIds: ["latin"] }
        : { fontIds: [], fontManifestIds: [] },
    );
    const { result } = await readyRuntime();
    result.current.selectionFor("\u{1f600}");
    await waitFor(() =>
      expect(result.current.selectionFor("\u{1f600}")).toEqual({
        fontIds: [9],
        fontManifestIds: ["latin"],
      }),
    );
  });

  it("lays out a line once and serves the cache thereafter", async () => {
    const { result } = await readyRuntime();
    result.current.layoutLine(request());
    await waitFor(() =>
      expect(result.current.layoutLine(request())).not.toBeNull(),
    );

    const before = layoutRubyParagraph.mock.calls.length;
    result.current.layoutLine(request());
    result.current.layoutLine(request());
    expect(layoutRubyParagraph.mock.calls.length).toBe(before);
  });

  it("keys the cache on everything that changes geometry", async () => {
    const { result } = await readyRuntime();
    result.current.layoutLine(request());
    await waitFor(() =>
      expect(result.current.layoutLine(request())).not.toBeNull(),
    );

    const before = layoutRubyParagraph.mock.calls.length;
    result.current.layoutLine(request({ fontSize: 40 }));
    result.current.layoutLine(request({ maxWidth: 500 }));
    result.current.layoutLine(request({ reserveRubyRow: true }));
    expect(layoutRubyParagraph.mock.calls.length).toBe(before + 3);
  });

  it("shapes ruby readings with the same chain as the base text", async () => {
    const { result } = await readyRuntime();
    result.current.layoutLine(
      request({
        text: "\u5c71",
        furigana: [{ content: "\u3084\u307e", leftIndex: 0, rightIndex: 1 }],
      }),
    );
    // Selection must cover base + every reading, or the ruby renders as tofu.
    await waitFor(() =>
      expect(ensureFontsFor).toHaveBeenCalledWith("\u5c71\u3084\u307e"),
    );
  });

  it("shares document-level ruby anchors and drops layouts widened by them", async () => {
    layoutRubyParagraph.mockImplementation(
      echoingLayout({
        baseAscentEm: 0.88,
        rubyAscentEm: 0.88,
        rubyDescentEm: 0.12,
      }),
    );
    const { result } = await readyRuntime();
    result.current.layoutLine(request());
    await waitFor(() =>
      expect(result.current.layoutLine(request())).not.toBeNull(),
    );

    // The second line is laid out with the anchors the first one established.
    // Its text differs, so its own font selection has to resolve first.
    result.current.layoutLine(request({ lineIndex: 1, text: "world" }));
    await waitFor(() =>
      expect(
        result.current.layoutLine(request({ lineIndex: 1, text: "world" })),
      ).not.toBeNull(),
    );
    await waitFor(() => {
      const last = layoutRubyParagraph.mock.calls.at(-1)?.[1] as
        Record<string, unknown> | undefined;
      expect(last?.rubyMetrics).toEqual({
        baseAscentEm: 0.88,
        rubyAscentEm: 0.88,
        rubyDescentEm: 0.12,
      });
    });
  });

  it("escalates only when a chain font actually declares the missing coverage", async () => {
    const { result } = await readyRuntime();
    result.current.maybeEscalate("abc");
    await waitFor(() => expect(hasUnregisteredCoverageFor).toHaveBeenCalled());
    expect(escalateFallback).not.toHaveBeenCalled();
  });

  it("escalates at most once per text", async () => {
    hasUnregisteredCoverageFor.mockResolvedValue(true);
    const { result } = await readyRuntime();
    result.current.maybeEscalate("abc");
    result.current.maybeEscalate("abc");
    await waitFor(() => expect(escalateFallback).toHaveBeenCalledTimes(1));
    result.current.maybeEscalate("abc");
    expect(escalateFallback).toHaveBeenCalledTimes(1);
  });

  it("reports a failed escalation without blanking the view", async () => {
    hasUnregisteredCoverageFor.mockResolvedValue(true);
    escalateFallback.mockRejectedValue(new Error("offline"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { result } = await readyRuntime();
    result.current.maybeEscalate("abc");
    await waitFor(() => expect(result.current.escalationError).toBe("offline"));
    expect(result.current.status).toBe("ready");
    warn.mockRestore();
  });

  it("survives a per-line shaping failure without losing the rest", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { result } = await readyRuntime();
    result.current.layoutLine(request());
    await waitFor(() =>
      expect(result.current.layoutLine(request())).not.toBeNull(),
    );

    layoutRubyParagraph.mockImplementationOnce(() => {
      throw new Error("bad font");
    });
    expect(
      result.current.layoutLine(request({ lineIndex: 2, text: "x" })),
    ).toBeNull();
    expect(result.current.status).toBe("ready");
    warn.mockRestore();
  });

  it("returns null rather than shaping blank lines", async () => {
    const { result } = await readyRuntime();
    expect(result.current.layoutLine(request({ text: "   " }))).toBeNull();
    expect(layoutRubyParagraph).not.toHaveBeenCalled();
  });
});

describe("runtime lifecycle and document scope", () => {
  it("frees the WASM shaper on unmount so font buffers are not leaked", async () => {
    const { unmount } = await readyRuntime();
    expect(freeShaper).not.toHaveBeenCalled();
    unmount();
    // The registered faces can be tens of megabytes inside the module's linear
    // memory; dropping the JS reference alone does not reclaim them.
    expect(freeShaper).toHaveBeenCalledTimes(1);
  });

  it("resetDocument clears escalation state without discarding loaded fonts", async () => {
    hasUnregisteredCoverageFor.mockResolvedValue(true);
    escalateFallback.mockRejectedValue(new Error("offline"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { result } = await readyRuntime();

    result.current.maybeEscalate("abc");
    await waitFor(() => expect(result.current.escalationError).toBe("offline"));

    act(() => result.current.resetDocument());
    expect(result.current.escalationError).toBeNull();

    // The next document may legitimately need the same escalation attempt.
    escalateFallback.mockResolvedValue({
      fontIds: [1, 2],
      fontManifestIds: ["latin", "han"],
    });
    result.current.maybeEscalate("abc");
    await waitFor(() => expect(escalateFallback).toHaveBeenCalledTimes(2));
    warn.mockRestore();
  });

  it("resetDocument drops the previous document's ruby anchors", async () => {
    layoutRubyParagraph.mockReturnValue(
      layoutResult({
        rubyMetrics: {
          baseAscentEm: 1.2,
          rubyAscentEm: 1.2,
          rubyDescentEm: 0.4,
        },
      }),
    );
    const { result } = await readyRuntime();
    result.current.layoutLine(request());
    await waitFor(() =>
      expect(result.current.layoutLine(request())).not.toBeNull(),
    );

    act(() => result.current.resetDocument());
    layoutRubyParagraph.mockReturnValue(layoutResult());
    result.current.layoutLine(request());
    await waitFor(() =>
      expect(result.current.layoutLine(request())).not.toBeNull(),
    );
    // A tall first document must not permanently inflate the next one's rows.
    const last = layoutRubyParagraph.mock.calls.at(-1)?.[1] as
      Record<string, unknown> | undefined;
    expect(last?.rubyMetrics).toBeUndefined();
  });
});

describe("document-level ruby anchors widen across the whole document", () => {
  it("grows the shared anchor when a later line needs a taller box", async () => {
    const small = {
      baseAscentEm: 0.88,
      rubyAscentEm: 0.88,
      rubyDescentEm: 0.12,
    };
    const tall = {
      baseAscentEm: 1.09,
      rubyAscentEm: 1.09,
      rubyDescentEm: 0.32,
    };

    layoutRubyParagraph.mockImplementation(echoingLayout(small));
    const { result } = await readyRuntime();
    result.current.layoutLine(request());
    await waitFor(() =>
      expect(result.current.layoutLine(request())).not.toBeNull(),
    );

    // A second line whose fonts genuinely need more room. Before the fix the
    // runtime widened from `rubyMetrics`, which layout echoes back unchanged, so
    // the first line pinned the anchor forever and this line was laid out
    // against the smaller box - its ruby colliding with the base text.
    layoutRubyParagraph.mockImplementation(echoingLayout(tall));
    result.current.layoutLine(request({ lineIndex: 1, text: "world" }));
    await waitFor(() =>
      expect(
        result.current.layoutLine(request({ lineIndex: 1, text: "world" })),
      ).not.toBeNull(),
    );

    // Anything laid out afterwards must see the widened anchor.
    await waitFor(() =>
      expect(
        result.current.layoutLine(request({ lineIndex: 2, text: "third" })),
      ).not.toBeNull(),
    );
    const last = layoutRubyParagraph.mock.calls.at(-1)?.[1] as
      Record<string, unknown> | undefined;
    expect(last?.rubyMetrics).toEqual(tall);
  });

  it("never shrinks the anchor back for a later, shorter line", async () => {
    const tall = {
      baseAscentEm: 1.09,
      rubyAscentEm: 1.09,
      rubyDescentEm: 0.32,
    };
    const small = {
      baseAscentEm: 0.88,
      rubyAscentEm: 0.88,
      rubyDescentEm: 0.12,
    };

    layoutRubyParagraph.mockImplementation(echoingLayout(tall));
    const { result } = await readyRuntime();
    result.current.layoutLine(request());
    await waitFor(() =>
      expect(result.current.layoutLine(request())).not.toBeNull(),
    );

    layoutRubyParagraph.mockImplementation(echoingLayout(small));
    result.current.layoutLine(request({ lineIndex: 1, text: "world" }));
    await waitFor(() =>
      expect(
        result.current.layoutLine(request({ lineIndex: 1, text: "world" })),
      ).not.toBeNull(),
    );

    const last = layoutRubyParagraph.mock.calls.at(-1)?.[1] as
      Record<string, unknown> | undefined;
    expect(last?.rubyMetrics).toEqual(tall);
  });
});

describe("the line that widened the anchor is not left stale", () => {
  it("re-lays the widening line against the anchor it produced", async () => {
    const small = {
      baseAscentEm: 0.88,
      rubyAscentEm: 0.88,
      rubyDescentEm: 0.12,
    };
    const tall = {
      baseAscentEm: 1.09,
      rubyAscentEm: 1.09,
      rubyDescentEm: 0.32,
    };

    layoutRubyParagraph.mockImplementation(echoingLayout(small));
    const { result } = await readyRuntime();
    result.current.layoutLine(request());
    await waitFor(() =>
      expect(result.current.layoutLine(request())).not.toBeNull(),
    );

    layoutRubyParagraph.mockImplementation(echoingLayout(tall));
    await waitFor(() =>
      expect(
        result.current.layoutLine(request({ lineIndex: 1, text: "world" })),
      ).not.toBeNull(),
    );

    // Its first pass necessarily used the old, narrower anchor. Caching that
    // would leave this one line inconsistent with every other, so it must be
    // recomputed - the final layout it serves uses the widened anchor.
    const applied = result.current.layoutLine(
      request({ lineIndex: 1, text: "world" }),
    );
    expect(applied?.rubyMetrics).toEqual(tall);
  });
});
