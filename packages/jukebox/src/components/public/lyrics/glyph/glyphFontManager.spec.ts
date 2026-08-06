import { describe, expect, it, vi } from "vitest";
import {
  GlyphFontCoverageLoadError,
  GlyphFontManager,
  type FontCoverageResponse,
  type FontRegisteringShaper,
} from "./glyphFontManager";
import { GlyphFontLoadError } from "./fontLoader";

// ---------------------------------------------------------------------------
// Fakes: no network, no WASM.
// ---------------------------------------------------------------------------

/** A fake shaper that hands out incremental, stable ids and counts registrations. */
class FakeShaper implements FontRegisteringShaper {
  readonly registered: Uint8Array[] = [];
  failFor = new Set<Uint8Array>();

  registerFont(bytes: Uint8Array): number {
    if (this.failFor.has(bytes)) {
      throw new Error("unparsable font bytes");
    }
    this.registered.push(bytes);
    return this.registered.length; // 1-based, stable for this shaper's lifetime
  }
}

/** A representative test chain: big CJK subset first, Thai, then a small Latin fallback last. */
const CJK = "cjk-base";
const THAI = "thai";
const LATIN = "latin";
const TEST_CHAIN = [CJK, THAI, LATIN] as const;

/**
 * Coverage that models declared (narrow, non-overlapping) ranges: the CJK font
 * deliberately does *not* declare Basic Latin, so Latin text prefers the tiny
 * Latin fallback instead of downloading the multi-megabyte CJK base.
 */
const TEST_COVERAGE: FontCoverageResponse = {
  fonts: [
    {
      id: CJK,
      ranges: [
        [0x3040, 0x309f], // Hiragana
        [0x30a0, 0x30ff], // Katakana
        [0x4e00, 0x9fff], // CJK Unified Ideographs
      ],
    },
    {
      id: THAI,
      ranges: [[0x0e00, 0x0e7f]], // Thai
    },
    {
      id: LATIN,
      ranges: [
        [0x0020, 0x0020], // space
        [0x0041, 0x005a], // A-Z
        [0x0061, 0x007a], // a-z
        [0x0300, 0x036f], // Combining Diacritical Marks
      ],
    },
  ],
};

interface Harness {
  manager: GlyphFontManager;
  shaper: FakeShaper;
  byteFetches: string[];
  coverageFetches: number;
  fetchBytes: ReturnType<typeof vi.fn>;
  fetchCoverage: ReturnType<typeof vi.fn>;
}

function makeHarness(
  options: {
    chain?: readonly string[];
    coverage?: FontCoverageResponse;
    coverageError?: () => Error;
    bytesFor?: (id: string) => Uint8Array;
  } = {},
): Harness {
  const shaper = new FakeShaper();
  const byteFetches: string[] = [];
  let coverageFetches = 0;

  const fetchBytes = vi.fn(async (id: string) => {
    byteFetches.push(id);
    return (options.bytesFor ?? ((x: string) => new TextEncoder().encode(x)))(
      id,
    );
  });

  const fetchCoverage = vi.fn(async (): Promise<FontCoverageResponse> => {
    coverageFetches++;
    if (options.coverageError) throw options.coverageError();
    return options.coverage ?? TEST_COVERAGE;
  });

  const manager = new GlyphFontManager({
    shaper,
    fontManifestIds: options.chain ?? TEST_CHAIN,
    fetchBytes,
    fetchCoverage,
  });

  return {
    manager,
    shaper,
    byteFetches,
    get coverageFetches() {
      return coverageFetches;
    },
    fetchBytes,
    fetchCoverage,
  } as Harness;
}

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

describe("GlyphFontManager.ensureFontsFor selection", () => {
  it("selects only the Latin fallback for Latin-only text", async () => {
    const h = makeHarness();
    const result = await h.manager.ensureFontsFor("Hello");

    expect(result.fontManifestIds).toEqual([LATIN]);
    expect(result.fontIds).toEqual([1]);
    expect(h.byteFetches).toEqual([LATIN]);
    // The multi-megabyte CJK base was never fetched.
    expect(h.byteFetches).not.toContain(CJK);
  });

  it("selects the earlier CJK subset for Japanese text without pulling later chain members", async () => {
    const h = makeHarness();
    const result = await h.manager.ensureFontsFor("こんにちは");

    expect(result.fontManifestIds).toEqual([CJK]);
    expect(result.fontIds).toEqual([1]);
    expect(h.byteFetches).toEqual([CJK]);
    expect(h.byteFetches).not.toContain(THAI);
    expect(h.byteFetches).not.toContain(LATIN);
  });

  it("selects several fonts, in chain order, for mixed-script text", async () => {
    const h = makeHarness();
    // Latin 'A', Hiragana 'こ', Thai 'ก', spaces.
    const result = await h.manager.ensureFontsFor("A こ ก");

    expect(result.fontManifestIds).toEqual([CJK, THAI, LATIN]);
    // Ids follow registration order (CJK first, then Thai, then Latin).
    expect(result.fontIds).toEqual([1, 2, 3]);
    expect(new Set(h.byteFetches)).toEqual(new Set([CJK, THAI, LATIN]));
  });

  it("returns stable ids across repeated calls and never re-fetches a cached font", async () => {
    const h = makeHarness();
    const first = await h.manager.ensureFontsFor("Hello");
    const second = await h.manager.ensureFontsFor("World");

    expect(first.fontIds).toEqual([1]);
    expect(second.fontIds).toEqual([1]); // same stable id
    expect(h.byteFetches).toEqual([LATIN]); // fetched exactly once total
  });
});

// ---------------------------------------------------------------------------
// Uncovered codepoints & empty text
// ---------------------------------------------------------------------------

describe("GlyphFontManager uncovered / empty text", () => {
  it("ignores codepoints no font declares (tofu case) without throwing", async () => {
    const h = makeHarness();
    // U+1F600 GRINNING FACE is covered by nothing in TEST_COVERAGE.
    const result = await h.manager.ensureFontsFor("😀");

    expect(result.fontManifestIds).toEqual([]);
    expect(result.fontIds).toEqual([]);
    expect(h.byteFetches).toEqual([]);
  });

  it("selects only the covered subset when text mixes covered and uncovered codepoints", async () => {
    const h = makeHarness();
    const result = await h.manager.ensureFontsFor("Hi😀");

    expect(result.fontManifestIds).toEqual([LATIN]);
    expect(h.byteFetches).toEqual([LATIN]);
  });

  it("ignores coverage advertised for ids outside the configured chain", async () => {
    const h = makeHarness({
      coverage: {
        fonts: [
          ...TEST_COVERAGE.fonts,
          // An extra font not in the chain claiming to cover the emoji.
          { id: "not-in-chain", ranges: [[0x1f600, 0x1f600]] },
        ],
      },
    });
    const result = await h.manager.ensureFontsFor("😀");

    expect(result.fontManifestIds).toEqual([]);
    expect(h.byteFetches).toEqual([]);
  });

  it("selects nothing and never fetches coverage for empty text", async () => {
    const h = makeHarness();
    const result = await h.manager.ensureFontsFor("");

    expect(result).toEqual({ fontIds: [], fontManifestIds: [] });
    expect(h.coverageFetches).toBe(0);
    expect(h.byteFetches).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Grapheme-cluster-aware fallback (matches the Rust shaper)
// ---------------------------------------------------------------------------

describe("GlyphFontManager grapheme-cluster fallback", () => {
  it("does not over-select for a base+mark cluster no single font covers", async () => {
    const h = makeHarness();
    // "あ" (Hiragana, CJK) + U+0300 (combining grave, only in LATIN). The
    // shaper resolves the *whole cluster* to one font: no font covers both, so
    // it falls back to the first covering the base (あ) -> CJK. Selecting LATIN
    // too (as a naive per-codepoint scan would) is wrong and pointless.
    const result = await h.manager.ensureFontsFor("あ\u0300");

    expect(result.fontManifestIds).toEqual([CJK]);
    expect(h.byteFetches).toEqual([CJK]);
    // The ~30 MB CJK base is the only download; LATIN is never pulled in.
    expect(h.byteFetches).not.toContain(LATIN);

    // And the escalation predicate agrees: nothing new could help this cluster.
    expect(await h.manager.hasUnregisteredCoverageFor("あ\u0300")).toBe(false);
  });

  it("prefers the font covering all significant scalars over an earlier base-only font", async () => {
    const BASE_ONLY = "base-only";
    const FULL = "full";
    const h = makeHarness({
      chain: [BASE_ONLY, FULL],
      coverage: {
        fonts: [
          { id: BASE_ONLY, ranges: [[0x0065, 0x0065]] }, // 'e' only
          {
            id: FULL,
            ranges: [
              [0x0065, 0x0065], // 'e'
              [0x0301, 0x0301], // combining acute
            ],
          },
        ],
      },
    });
    // "é" as base 'e' + U+0301: the first font covering *both* wins.
    const result = await h.manager.ensureFontsFor("e\u0301");
    expect(result.fontManifestIds).toEqual([FULL]);
    expect(h.byteFetches).toEqual([FULL]);
  });

  it("never lets ignorable-only scalars (ZWJ / variation selector) pull in an unrelated font", async () => {
    // THAI's cmap happens to include the ZWJ/VS ranges — exactly the kind of
    // incidental coverage that must NOT force a Thai download for Latin text.
    const h = makeHarness({
      coverage: {
        fonts: [
          TEST_COVERAGE.fonts[0], // CJK
          {
            id: THAI,
            ranges: [
              [0x0e00, 0x0e7f], // Thai
              [0x200b, 0x200f], // ZWSP..RLM (incl. ZWJ U+200D)
              [0xfe00, 0xfe0f], // variation selectors
            ],
          },
          TEST_COVERAGE.fonts[2], // LATIN
        ],
      },
    });

    // Trailing ZWJ (default-ignorable) must not select THAI.
    const zwj = await h.manager.ensureFontsFor("Hello\u200d");
    expect(zwj.fontManifestIds).toEqual([LATIN]);
    expect(h.byteFetches).not.toContain(THAI);

    // Variation selector (default-ignorable) must not select THAI either.
    const vs = await h.manager.ensureFontsFor("A\ufe0f");
    expect(vs.fontManifestIds).toEqual([LATIN]);
    expect(h.byteFetches).not.toContain(THAI);
  });

  it("treats an emoji ZWJ sequence as one uncoverable cluster and selects nothing", async () => {
    const h = makeHarness();
    // U+1F468 ZWJ U+1F469 ZWJ U+1F467 (family) — one grapheme cluster; the ZWJs
    // are ignorable, the emoji are undeclared, so nothing is selected.
    const result = await h.manager.ensureFontsFor(
      "\u{1f468}\u200d\u{1f469}\u200d\u{1f467}",
    );
    expect(result.fontManifestIds).toEqual([]);
    expect(h.byteFetches).toEqual([]);
    expect(
      await h.manager.hasUnregisteredCoverageFor(
        "\u{1f468}\u200d\u{1f469}\u200d\u{1f467}",
      ),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Escalation
// ---------------------------------------------------------------------------

describe("GlyphFontManager.escalateFallback", () => {
  it("loads the remaining chain members only when a caller escalates on missing ranges", async () => {
    const h = makeHarness();
    // Text needs Latin; the emoji has no declared coverage -> would surface as
    // missingFontRanges after layout.
    const selection = await h.manager.ensureFontsFor("Hi😀");
    expect(selection.fontManifestIds).toEqual([LATIN]);
    expect(h.byteFetches).toEqual([LATIN]);

    // Caller sees missingFontRanges and escalates.
    const escalated = await h.manager.escalateFallback();
    expect(escalated.fontManifestIds).toEqual([CJK, THAI, LATIN]);
    expect(escalated.newlyLoaded).toEqual([CJK, THAI]);
    // The broad fallback members were only fetched now, on demand.
    expect(new Set(h.byteFetches)).toEqual(new Set([LATIN, CJK, THAI]));
    // Full ordered chain returned for a re-layout. LATIN keeps its id (1) from
    // the earlier selection; CJK/THAI are the newly-registered 2/3 — returned
    // in chain order, proving ids stay stable.
    expect(escalated.fontIds).toEqual([2, 3, 1]);
  });

  it("is idempotent and cheap once everything is loaded (newlyLoaded empty)", async () => {
    const h = makeHarness();
    await h.manager.ensureFontsFor("Hi😀");
    await h.manager.escalateFallback();

    const again = await h.manager.escalateFallback();
    expect(again.newlyLoaded).toEqual([]);
    expect(again.fontManifestIds).toEqual([CJK, THAI, LATIN]);
    // No additional byte fetches happened on the second escalation.
    expect(h.byteFetches.filter((id) => id === CJK)).toHaveLength(1);
    expect(h.byteFetches.filter((id) => id === THAI)).toHaveLength(1);
  });

  it("reports newlyLoaded empty when the whole chain was already selected", async () => {
    const h = makeHarness();
    await h.manager.ensureFontsFor("A こ ก"); // selects the whole chain
    const escalated = await h.manager.escalateFallback();

    expect(escalated.newlyLoaded).toEqual([]);
    expect(new Set(h.byteFetches)).toEqual(new Set([CJK, THAI, LATIN]));
  });
});

// ---------------------------------------------------------------------------
// hasUnregisteredCoverageFor (escalation-worthwhile predicate)
// ---------------------------------------------------------------------------

describe("GlyphFontManager.hasUnregisteredCoverageFor", () => {
  it("returns true when a chain font declares coverage but is not yet registered", async () => {
    const h = makeHarness();
    // Japanese text: CJK declares coverage and nothing is loaded yet.
    expect(await h.manager.hasUnregisteredCoverageFor("こんにちは")).toBe(true);
    // No fonts were fetched just to answer the predicate.
    expect(h.byteFetches).toEqual([]);
  });

  it("returns false once the fonts a text needs are already registered", async () => {
    const h = makeHarness();
    await h.manager.ensureFontsFor("Hello"); // registers LATIN
    expect(await h.manager.hasUnregisteredCoverageFor("World")).toBe(false);
  });

  it("returns false when the whole chain is loaded", async () => {
    const h = makeHarness();
    await h.manager.escalateFallback(); // loads every chain member
    expect(await h.manager.hasUnregisteredCoverageFor("A こ ก")).toBe(false);
  });

  it("returns false for an undeclared codepoint (emoji) — escalation cannot help", async () => {
    const h = makeHarness();
    expect(await h.manager.hasUnregisteredCoverageFor("😀")).toBe(false);
    expect(h.byteFetches).toEqual([]);
  });

  it("returns false when only uncovered codepoints remain alongside a loaded font", async () => {
    const h = makeHarness();
    await h.manager.ensureFontsFor("Hi"); // LATIN registered
    // 'i' etc. covered by the already-loaded LATIN; the emoji is undeclared by
    // the whole chain, so escalation is futile.
    expect(await h.manager.hasUnregisteredCoverageFor("Hi😀")).toBe(false);
  });

  it("returns false for empty text", async () => {
    const h = makeHarness();
    expect(await h.manager.hasUnregisteredCoverageFor("")).toBe(false);
    expect(h.coverageFetches).toBe(0);
  });

  it("returns true (degrade to loading the chain) when coverage is unavailable", async () => {
    const h = makeHarness({
      coverageError: () => new GlyphFontCoverageLoadError("boom"),
    });
    expect(await h.manager.hasUnregisteredCoverageFor("Hi")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Concurrency & memoization
// ---------------------------------------------------------------------------

describe("GlyphFontManager concurrency", () => {
  it("fetches each font and the coverage document once under concurrent ensureFontsFor calls", async () => {
    const h = makeHarness();

    const [a, b, c] = await Promise.all([
      h.manager.ensureFontsFor("A こ ก"),
      h.manager.ensureFontsFor("A こ ก"),
      h.manager.ensureFontsFor("こ"),
    ]);

    expect(a.fontManifestIds).toEqual([CJK, THAI, LATIN]);
    expect(b.fontManifestIds).toEqual([CJK, THAI, LATIN]);
    expect(c.fontManifestIds).toEqual([CJK]);

    // Coverage fetched exactly once despite three concurrent callers.
    expect(h.coverageFetches).toBe(1);
    // Each font fetched exactly once.
    expect(h.byteFetches.filter((id) => id === CJK)).toHaveLength(1);
    expect(h.byteFetches.filter((id) => id === THAI)).toHaveLength(1);
    expect(h.byteFetches.filter((id) => id === LATIN)).toHaveLength(1);
  });

  it("dedupes concurrent ensureFontsFor and escalateFallback onto one registration per font", async () => {
    const h = makeHarness();
    const [selection, escalation] = await Promise.all([
      h.manager.ensureFontsFor("Hi"),
      h.manager.escalateFallback(),
    ]);

    expect(selection.fontManifestIds).toEqual([LATIN]);
    expect(escalation.fontManifestIds).toEqual([CJK, THAI, LATIN]);
    // Latin registered exactly once even though both paths wanted it.
    expect(h.byteFetches.filter((id) => id === LATIN)).toHaveLength(1);
    expect(h.shaper.registered).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// Coverage fetch failure & retry
// ---------------------------------------------------------------------------

describe("GlyphFontManager coverage failures", () => {
  it("surfaces a coverage fetch failure, then succeeds on retry (memo cleared on failure)", async () => {
    let attempts = 0;
    const shaper = new FakeShaper();
    const fetchBytes = vi.fn(async (id: string) =>
      new TextEncoder().encode(id),
    );
    const fetchCoverage = vi.fn(async (): Promise<FontCoverageResponse> => {
      attempts++;
      if (attempts === 1) {
        throw new GlyphFontCoverageLoadError("coverage route 503");
      }
      return TEST_COVERAGE;
    });
    const manager = new GlyphFontManager({
      shaper,
      fontManifestIds: TEST_CHAIN,
      fetchBytes,
      fetchCoverage,
    });

    await expect(manager.ensureFontsFor("Hello")).rejects.toBeInstanceOf(
      GlyphFontCoverageLoadError,
    );
    // Retry succeeds because the failed memo was cleared.
    const result = await manager.ensureFontsFor("Hello");
    expect(result.fontManifestIds).toEqual([LATIN]);
    expect(fetchCoverage).toHaveBeenCalledTimes(2);
  });

  it("dedupes concurrent callers onto a single failing coverage attempt", async () => {
    const h = makeHarness({
      coverageError: () => new GlyphFontCoverageLoadError("boom"),
    });

    const results = await Promise.allSettled([
      h.manager.ensureFontsFor("Hi"),
      h.manager.ensureFontsFor("Yo"),
    ]);

    expect(results.every((r) => r.status === "rejected")).toBe(true);
    // Both concurrent callers shared one in-flight coverage request.
    expect(h.coverageFetches).toBe(1);
  });

  it("throws GlyphFontCoverageLoadError for a malformed coverage document", async () => {
    const h = makeHarness({
      coverage: { fonts: [{ id: LATIN }] } as unknown as FontCoverageResponse,
    });
    await expect(h.manager.ensureFontsFor("Hi")).rejects.toBeInstanceOf(
      GlyphFontCoverageLoadError,
    );
  });
});

// ---------------------------------------------------------------------------
// Coverage validation hardening
// ---------------------------------------------------------------------------

describe("GlyphFontManager coverage validation", () => {
  /** Builds a coverage doc whose LATIN entry uses `ranges`; CJK/THAI stay valid. */
  function coverageWithLatin(ranges: unknown): FontCoverageResponse {
    return {
      fonts: [
        TEST_COVERAGE.fonts[0],
        TEST_COVERAGE.fonts[1],
        { id: LATIN, ranges },
      ],
    } as unknown as FontCoverageResponse;
  }

  it("rejects overlapping ranges (would break the binary search)", async () => {
    const h = makeHarness({
      coverage: coverageWithLatin([
        [1, 100],
        [50, 60],
      ]),
    });
    await expect(h.manager.ensureFontsFor("Hi")).rejects.toMatchObject({
      name: "GlyphFontCoverageLoadError",
    });
  });

  it("rejects duplicate ranges", async () => {
    const h = makeHarness({
      coverage: coverageWithLatin([
        [0x0041, 0x005a],
        [0x0041, 0x005a],
      ]),
    });
    await expect(h.manager.ensureFontsFor("Hi")).rejects.toBeInstanceOf(
      GlyphFontCoverageLoadError,
    );
  });

  it("rejects fractional (non-integer) bounds", async () => {
    const h = makeHarness({
      coverage: coverageWithLatin([[0x0041, 90.5]]),
    });
    await expect(h.manager.ensureFontsFor("Hi")).rejects.toBeInstanceOf(
      GlyphFontCoverageLoadError,
    );
  });

  it("rejects bounds outside the Unicode scalar range", async () => {
    const h = makeHarness({
      coverage: coverageWithLatin([[0, 0x110000]]),
    });
    await expect(h.manager.ensureFontsFor("Hi")).rejects.toBeInstanceOf(
      GlyphFontCoverageLoadError,
    );
  });

  it("rejects a coverage document missing a configured chain id", async () => {
    const h = makeHarness({
      coverage: { fonts: [TEST_COVERAGE.fonts[0], TEST_COVERAGE.fonts[1]] }, // LATIN missing
    });
    await expect(h.manager.ensureFontsFor("Hi")).rejects.toMatchObject({
      name: "GlyphFontCoverageLoadError",
    });
  });

  it("rejects a duplicate chain id entry", async () => {
    const h = makeHarness({
      coverage: { fonts: [...TEST_COVERAGE.fonts, TEST_COVERAGE.fonts[2]] }, // LATIN twice
    });
    await expect(h.manager.ensureFontsFor("Hi")).rejects.toBeInstanceOf(
      GlyphFontCoverageLoadError,
    );
  });
});

// ---------------------------------------------------------------------------
// Registration failure & construction
// ---------------------------------------------------------------------------

describe("GlyphFontManager registration & construction", () => {
  it("surfaces a registration failure as a GlyphFontLoadError and allows retry", async () => {
    const shaper = new FakeShaper();
    const latinBytes = new Uint8Array([9, 9, 9]);
    let calls = 0;
    const fetchBytes = vi.fn(async () => {
      calls++;
      return calls === 1 ? latinBytes : new Uint8Array([1, 2, 3]);
    });
    shaper.failFor.add(latinBytes);

    const manager = new GlyphFontManager({
      shaper,
      fontManifestIds: TEST_CHAIN,
      fetchBytes,
      fetchCoverage: async () => TEST_COVERAGE,
    });

    await expect(manager.ensureFontsFor("Hi")).rejects.toMatchObject({
      name: "GlyphFontLoadError",
      fontManifestId: LATIN,
    });
    // Cache cleared on failure -> a retry re-fetches and succeeds.
    const result = await manager.ensureFontsFor("Hi");
    expect(result.fontManifestIds).toEqual([LATIN]);
    expect(fetchBytes).toHaveBeenCalledTimes(2);
  });

  it("throws for an empty configured chain", () => {
    expect(
      () =>
        new GlyphFontManager({
          shaper: new FakeShaper(),
          fontManifestIds: [],
          fetchBytes: async () => new Uint8Array([1]),
          fetchCoverage: async () => TEST_COVERAGE,
        }),
    ).toThrow(GlyphFontLoadError);
  });

  it("exposes the configured chain and per-id registration state", async () => {
    const h = makeHarness();
    expect(h.manager.chain).toEqual([CJK, THAI, LATIN]);
    expect(h.manager.isRegistered(LATIN)).toBe(false);
    await h.manager.ensureFontsFor("Hi");
    expect(h.manager.isRegistered(LATIN)).toBe(true);
    expect(h.manager.isRegistered(CJK)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Default fetchers (still no real network: injected fetchImpl)
// ---------------------------------------------------------------------------

describe("GlyphFontManager default fetchers", () => {
  it("fetches coverage from the default route and font bytes per id via the injected fetch", async () => {
    const coverageBody = JSON.stringify(TEST_COVERAGE);
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.endsWith("/coverage")) {
        return new Response(coverageBody, { status: 200 });
      }
      return new Response(new Uint8Array([1, 2, 3, 4]), { status: 200 });
    }) as unknown as typeof fetch;

    const manager = new GlyphFontManager({
      shaper: new FakeShaper(),
      fontManifestIds: TEST_CHAIN,
      fetchImpl,
    });

    const result = await manager.ensureFontsFor("Hi");
    expect(result.fontManifestIds).toEqual([LATIN]);
    expect(fetchImpl).toHaveBeenCalledWith("/api/fonts/coverage");
    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/fonts/latin",
      expect.anything(),
    );
  });

  it("surfaces a non-OK coverage response as GlyphFontCoverageLoadError with status", async () => {
    const fetchImpl = vi.fn(
      async () => new Response("nope", { status: 503 }),
    ) as unknown as typeof fetch;
    const manager = new GlyphFontManager({
      shaper: new FakeShaper(),
      fontManifestIds: TEST_CHAIN,
      fetchImpl,
    });

    await expect(manager.ensureFontsFor("Hi")).rejects.toMatchObject({
      name: "GlyphFontCoverageLoadError",
      status: 503,
    });
  });
});
