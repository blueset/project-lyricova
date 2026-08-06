import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Shared, hoisted GlyphFontManager method mocks so the module-mock factory
// below (which is hoisted above imports) can wire them into every constructed
// instance while each test still drives them directly.
const managerMocks = vi.hoisted(() => ({
  ensureFontsFor: vi.fn(),
  escalateFallback: vi.fn(),
  hasUnregisteredCoverageFor: vi.fn(),
  isRegistered: vi.fn(() => false),
  constructions: 0,
}));

const DEMO_CHAIN = [
  "mona-sans-latin-otf",
  "noto-sans-thai-vf-ttf",
  "source-han-sans-jp-vf",
  "source-han-sans-sc-vf",
  "source-han-sans-tc-vf",
  "source-han-sans-vf-otf",
];

vi.mock("./fontLoader", () => ({
  initGlyphRuntime: vi.fn(),
  createGlyphShaper: vi.fn(() => ({
    free: vi.fn(),
    glyphOutline: vi.fn(() => null),
    registerFont: vi.fn(() => 1),
  })),
}));

vi.mock("./glyphFontManager", () => ({
  GlyphFontManager: class {
    chain = DEMO_CHAIN;
    ensureFontsFor = managerMocks.ensureFontsFor;
    escalateFallback = managerMocks.escalateFallback;
    hasUnregisteredCoverageFor = managerMocks.hasUnregisteredCoverageFor;
    isRegistered = managerMocks.isRegistered;
    constructor() {
      managerMocks.constructions += 1;
    }
  },
}));

// Control the layout output (notably `missingFontRanges`) without real shaping.
vi.mock("./rubyLayout", () => ({ layoutRubyParagraph: vi.fn() }));

// jsdom never reports a size through ResizeObserver, but the lazy-loading path
// only runs when `draw` actually reaches the segment loop, so pin a size.
vi.mock("../../../../hooks/useResizeObserver", () => ({
  useResizeObserver: () => ({
    ref: { current: null },
    width: 480,
    height: 320,
  }),
}));

import { AppContext } from "../../AppContext";
import { GlyphCanvasLyrics } from "./glyphCanvas";
import { createGlyphShaper, initGlyphRuntime } from "./fontLoader";
import { layoutRubyParagraph } from "./rubyLayout";
import type { LyricsKitLyrics } from "@lyricova/components/gql/schema";

const initMock = vi.mocked(initGlyphRuntime);
const createShaperMock = vi.mocked(createGlyphShaper);
const layoutMock = vi.mocked(layoutRubyParagraph);

// A minimal 2D context: every method is a no-op, `measureText` returns a width.
const ctx2d = new Proxy(
  { measureText: () => ({ width: 0 }) } as Record<string, unknown>,
  {
    get(target, prop) {
      if (prop in target) return target[prop as string];
      return () => {};
    },
    set() {
      return true;
    },
  },
);

function makeLayout(
  missingFontRanges: Array<{
    utf8Start: number;
    utf8End: number;
    utf16Start: number;
    utf16End: number;
  }> = [],
) {
  return {
    lines: [],
    height: 24,
    width: 120,
    baseDirection: "ltr" as const,
    rubies: [],
    issues: [],
    missingFontRanges,
  } as unknown as ReturnType<typeof layoutRubyParagraph>;
}

const MISSING = [{ utf8Start: 0, utf8End: 3, utf16Start: 0, utf16End: 1 }];

function fullChainSelection() {
  return {
    fontIds: [1, 2, 3, 4, 5, 6],
    fontManifestIds: DEMO_CHAIN,
    newlyLoaded: DEMO_CHAIN,
  };
}

function makeLyrics(content = "テスト"): LyricsKitLyrics {
  return {
    lines: [
      {
        content,
        position: 0,
        attachments: {
          furigana: null,
          romaji: null,
          minor: false,
          role: 0,
          timeTag: null,
          translation: null,
          translations: {},
        },
      },
    ],
    translationLanguages: [],
    length: 10,
    quality: null,
  } as unknown as LyricsKitLyrics;
}

function renderWithPlayer(lyrics: LyricsKitLyrics = makeLyrics()) {
  const player = document.createElement("audio");
  const playerRef = { current: player } as { current: HTMLAudioElement };
  return render(
    <AppContext playerRef={playerRef}>
      <GlyphCanvasLyrics lyrics={lyrics} />
    </AppContext>,
  );
}

function status(): string | null {
  return screen.getByTestId("glyph-canvas-root").getAttribute("data-status");
}

beforeEach(() => {
  managerMocks.ensureFontsFor.mockReset();
  managerMocks.escalateFallback.mockReset();
  managerMocks.hasUnregisteredCoverageFor.mockReset();
  managerMocks.isRegistered.mockReset().mockReturnValue(false);
  managerMocks.constructions = 0;
  createShaperMock.mockClear();
  initMock.mockReset().mockResolvedValue(undefined);
  layoutMock.mockReset().mockReturnValue(makeLayout());

  // Sensible defaults; individual tests override.
  managerMocks.ensureFontsFor.mockResolvedValue({
    fontIds: [1],
    fontManifestIds: ["mona-sans-latin-otf"],
  });
  managerMocks.hasUnregisteredCoverageFor.mockResolvedValue(false);
  managerMocks.escalateFallback.mockResolvedValue(fullChainSelection());

  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    ctx2d as unknown as CanvasRenderingContext2D,
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GlyphCanvasLyrics lifecycle", () => {
  it("shows a loading state while the runtime initializes", async () => {
    initMock.mockReturnValue(new Promise<void>(() => {})); // never resolves

    renderWithPlayer();

    expect(await screen.findByTestId("glyph-canvas-loading")).toBeTruthy();
    expect(status()).toBe("loading");
    // No shaper/manager created until the runtime resolves.
    expect(createShaperMock).not.toHaveBeenCalled();
  });

  it("surfaces a runtime initialization failure instead of silently succeeding", async () => {
    initMock.mockRejectedValue(new Error("WASM route responded 502"));

    renderWithPlayer();

    const errorBox = await screen.findByTestId("glyph-canvas-error");
    expect(errorBox.textContent).toContain("WASM route responded 502");
    expect(status()).toBe("error");
    expect(screen.queryByTestId("glyph-canvas-loading")).toBeNull();
  });
});

describe("GlyphCanvasLyrics lazy readiness", () => {
  it("reaches ready from just the runtime + manager, without prefetching the chain", async () => {
    // ensureFontsFor never resolves: readiness must not depend on any font.
    managerMocks.ensureFontsFor.mockReturnValue(new Promise(() => {}));

    renderWithPlayer();

    await waitFor(() => expect(status()).toBe("ready"));
    expect(createShaperMock).toHaveBeenCalledTimes(1);
    expect(managerMocks.constructions).toBe(1);
    // The whole chain was never eagerly loaded.
    expect(managerMocks.escalateFallback).not.toHaveBeenCalled();
    // But the active line's fonts are being prepared lazily, per text.
    await waitFor(() =>
      expect(managerMocks.ensureFontsFor).toHaveBeenCalledWith("テスト"),
    );
  });
});

describe("GlyphCanvasLyrics per-text preparation", () => {
  it("prepares each line's fonts once and lays it out with the returned selection", async () => {
    managerMocks.ensureFontsFor.mockResolvedValue({
      fontIds: [3],
      fontManifestIds: ["source-han-sans-jp-vf"],
    });

    renderWithPlayer();

    await waitFor(() => expect(layoutMock).toHaveBeenCalled());
    // ensureFontsFor was consulted exactly once for the single line's text
    // (deduped across the several frames the media clock/effects drive).
    expect(
      managerMocks.ensureFontsFor.mock.calls.filter((c) => c[0] === "テスト"),
    ).toHaveLength(1);
    // The layout used the coverage-selected fontIds, not a whole eager chain.
    const request = layoutMock.mock.calls.at(-1)![1];
    expect(request.fontIds).toEqual([3]);
    expect(status()).toBe("ready");
  });

  it("guarantees a usable base font for an all-uncoverable (empty) selection", async () => {
    // The emoji line selects nothing; the base-fallback probe (a space)
    // resolves the small Latin font so shaping never gets an empty chain.
    managerMocks.ensureFontsFor.mockImplementation(async (text: string) => {
      if (text === " ") {
        return { fontIds: [1], fontManifestIds: ["mona-sans-latin-otf"] };
      }
      return { fontIds: [], fontManifestIds: [] };
    });

    renderWithPlayer(makeLyrics("😀😀"));

    await waitFor(() =>
      expect(managerMocks.ensureFontsFor).toHaveBeenCalledWith(" "),
    );
    await waitFor(() => expect(layoutMock).toHaveBeenCalled());
    // The uncoverable line is shaped with the guaranteed base font.
    const request = layoutMock.mock.calls.at(-1)![1];
    expect(request.fontIds).toEqual([1]);
  });
});

describe("GlyphCanvasLyrics escalation", () => {
  it("escalates once when a chain font can still cover the missing text", async () => {
    layoutMock.mockReturnValue(makeLayout(MISSING));
    managerMocks.hasUnregisteredCoverageFor.mockResolvedValue(true);

    renderWithPlayer();

    await waitFor(() =>
      expect(managerMocks.hasUnregisteredCoverageFor).toHaveBeenCalledWith(
        "テスト",
      ),
    );
    await waitFor(() =>
      expect(managerMocks.escalateFallback).toHaveBeenCalledTimes(1),
    );
    // Even though the re-layout still reports missing ranges, escalation never
    // loops for the same text.
    await new Promise((r) => setTimeout(r, 0));
    expect(managerMocks.escalateFallback).toHaveBeenCalledTimes(1);
  });

  it("does not escalate for genuinely uncoverable text (e.g. emoji)", async () => {
    layoutMock.mockReturnValue(makeLayout(MISSING));
    managerMocks.hasUnregisteredCoverageFor.mockResolvedValue(false);

    renderWithPlayer();

    await waitFor(() =>
      expect(managerMocks.hasUnregisteredCoverageFor).toHaveBeenCalledWith(
        "テスト",
      ),
    );
    await new Promise((r) => setTimeout(r, 0));
    expect(managerMocks.escalateFallback).not.toHaveBeenCalled();
    expect(status()).toBe("ready");
  });

  it("surfaces a non-fatal warning when escalation fails, without blanking or looping", async () => {
    layoutMock.mockReturnValue(makeLayout(MISSING));
    managerMocks.hasUnregisteredCoverageFor.mockResolvedValue(true);
    managerMocks.escalateFallback.mockRejectedValue(
      new Error("subset route responded 500"),
    );

    renderWithPlayer();

    // The failure is observable via the non-fatal font-warning banner...
    const warning = await screen.findByTestId("glyph-canvas-font-warning");
    expect(warning.textContent).toContain("subset route responded 500");
    // ...the working lyrics are not blanked with the fatal error overlay...
    expect(status()).toBe("ready");
    expect(screen.queryByTestId("glyph-canvas-error")).toBeNull();
    // ...and escalation is attempted exactly once for the text (no retry loop).
    await new Promise((r) => setTimeout(r, 0));
    expect(managerMocks.escalateFallback).toHaveBeenCalledTimes(1);
  });
});

describe("GlyphCanvasLyrics degradation", () => {
  it("falls back to the whole chain when the coverage route is unavailable", async () => {
    managerMocks.ensureFontsFor.mockRejectedValue(
      new Error("coverage route responded 503"),
    );

    renderWithPlayer();

    await waitFor(() =>
      expect(managerMocks.escalateFallback).toHaveBeenCalled(),
    );
    await waitFor(() => expect(layoutMock).toHaveBeenCalled());
    // Degraded, but still drawing with the full fallback chain and no error.
    const request = layoutMock.mock.calls.at(-1)![1];
    expect(request.fontIds).toEqual([1, 2, 3, 4, 5, 6]);
    expect(status()).toBe("ready");
    expect(screen.queryByTestId("glyph-canvas-error")).toBeNull();
  });

  it("surfaces the visible error state only when the fallback also fails", async () => {
    managerMocks.ensureFontsFor.mockRejectedValue(new Error("coverage down"));
    managerMocks.escalateFallback.mockRejectedValue(new Error("chain down"));

    renderWithPlayer();

    const errorBox = await screen.findByTestId("glyph-canvas-error");
    expect(errorBox.textContent).toContain("chain down");
    expect(status()).toBe("error");
  });
});
