import type { FontId } from "@lyricova/glyph-renderer";
import {
  DEFAULT_FONT_BASE_URL,
  DEFAULT_GLYPH_FONT_CHAIN,
  GlyphFontLoadError,
  fetchFontBytes,
} from "./fontLoader";

/**
 * Coverage-aware *lazy* font manager for the Glyph Canvas renderer.
 *
 * Where {@link loadGlyphFonts} eagerly fetches and registers the entire
 * fallback chain up front, this manager downloads and registers **only the
 * fonts a given text actually needs**. It does so by consulting a coverage
 * contract (`GET /api/fonts/coverage`) that declares, per font, the inclusive
 * UTF-32 codepoint ranges it covers, then walking the ordered chain and
 * selecting the minimal ordered subset whose declared coverage is required to
 * cover the text's distinct codepoints.
 *
 * Design/lifetime guarantees:
 *
 * - Registrations are cached per manifest id and never duplicated. Concurrent
 *   callers requesting the same font dedupe onto a single in-flight fetch +
 *   `registerFont`.
 * - Font ids are **stable for the lifetime of the shaper**: this manager never
 *   calls `removeFont`. This is deliberate — downstream renderers cache glyph
 *   outline paths keyed by `fontId`, so unregistering a font out from under
 *   those caches would silently corrupt already-drawn glyphs. Reclaiming font
 *   memory is therefore out of scope here; drop the whole shaper instead.
 * - The coverage document is fetched at most once and memoized. Concurrent
 *   callers dedupe onto one request; a failure clears the memo so a later call
 *   can retry.
 * - All failures surface as typed errors ({@link GlyphFontLoadError} for byte
 *   fetch/registration, {@link GlyphFontCoverageLoadError} for the coverage
 *   document) rather than being swallowed into a blank success.
 *
 * This lives alongside — and does not change — {@link loadGlyphFonts}, which
 * existing callers/tests still use for the eager whole-chain path.
 */

/** Default URL of the API package's font coverage contract route. */
export const DEFAULT_FONT_COVERAGE_URL = `${DEFAULT_FONT_BASE_URL}/coverage`;

/**
 * One inclusive `[startCodepoint, endCodepoint]` UTF-32 range. Per the API
 * contract, a font's ranges are ascending and non-overlapping.
 */
export type FontCoverageRange = [number, number];

/** One font's declared coverage in the `GET /api/fonts/coverage` contract. */
export interface FontCoverageEntry {
  id: string;
  ranges: FontCoverageRange[];
}

/** The shape of the `GET /api/fonts/coverage` response body. */
export interface FontCoverageResponse {
  fonts: FontCoverageEntry[];
}

/**
 * Thrown when the font coverage contract cannot be fetched or parsed. Mirrors
 * the {@link GlyphFontLoadError} style so callers can branch on a single error
 * taxonomy for the lazy font path.
 */
export class GlyphFontCoverageLoadError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "GlyphFontCoverageLoadError";
  }
}

/** Minimal shaper surface this manager needs: incremental, stable-id registration. */
export interface FontRegisteringShaper {
  registerFont(bytes: Uint8Array, faceIndex?: number): FontId;
}

/** An ordered font selection to hand to `ShapeRequest.fontIds`/`ParagraphRequest.fontIds`. */
export interface GlyphFontSelection {
  /** Registered font ids, in fallback (chain) order. Parallel to `fontManifestIds`. */
  fontIds: FontId[];
  /** Manifest ids, in fallback (chain) order. Parallel to `fontIds`. */
  fontManifestIds: string[];
}

/** The result of an escalation ({@link GlyphFontManager.escalateFallback}). */
export interface GlyphFontEscalation extends GlyphFontSelection {
  /**
   * The chain members that this escalation newly fetched/registered, in chain
   * order. **Empty when nothing new was loaded** — a caller re-laying-out on
   * `missingFontRanges` should stop once this is empty so it never loops
   * forever.
   */
  newlyLoaded: string[];
}

export interface GlyphFontManagerOptions {
  /** The shaper to register fonts into (e.g. a shared `GlyphShaper`). Required. */
  shaper: FontRegisteringShaper;
  /**
   * The ordered fallback chain of manifest ids (first-match-wins). Defaults to
   * {@link DEFAULT_GLYPH_FONT_CHAIN}. Must be non-empty.
   */
  fontManifestIds?: readonly string[];
  /** Base URL for the font byte + coverage routes. Defaults to {@link DEFAULT_FONT_BASE_URL}. */
  baseUrl?: string;
  /** Coverage contract URL. Defaults to `${baseUrl}/coverage`. */
  coverageUrl?: string;
  /** Injectable `fetch` for the default byte/coverage fetchers (defaults to the global). */
  fetchImpl?: typeof fetch;
  /**
   * Injectable font-byte fetcher. Defaults to {@link fetchFontBytes} bound to
   * `baseUrl`/`fetchImpl`. Provide a fake to avoid network in tests.
   */
  fetchBytes?: (fontManifestId: string) => Promise<Uint8Array>;
  /**
   * Injectable coverage source. Defaults to fetching + parsing
   * {@link coverageUrl}. Provide a fake to avoid network in tests.
   */
  fetchCoverage?: () => Promise<FontCoverageResponse>;
}

const graphemeSegmenter = new Intl.Segmenter(undefined, {
  granularity: "grapheme",
});

/**
 * Whether `codepoint` must never trigger font fallback or count toward
 * coverage: any Unicode default-ignorable format control (ZWJ/ZWNJ, variation
 * selectors, bidi controls, soft hyphen, …) or non-drawable control (LF/CR,
 * line/paragraph separators). This is an exact mirror of
 * `is_ignorable_for_coverage` (`is_default_ignorable || is_non_drawable_control`)
 * in `packages/glyph-renderer/src/shaping.rs`, so the client's per-cluster
 * font selection agrees with the shaper's own fallback decisions.
 */
function isIgnorableForCoverage(codepoint: number): boolean {
  return (
    codepoint === 0x000a ||
    codepoint === 0x000d ||
    codepoint === 0x00ad ||
    codepoint === 0x034f ||
    codepoint === 0x061c ||
    (codepoint >= 0x115f && codepoint <= 0x1160) ||
    (codepoint >= 0x17b4 && codepoint <= 0x17b5) ||
    (codepoint >= 0x180b && codepoint <= 0x180f) ||
    codepoint === 0x2028 ||
    codepoint === 0x2029 ||
    (codepoint >= 0x200b && codepoint <= 0x200f) ||
    (codepoint >= 0x202a && codepoint <= 0x202e) ||
    (codepoint >= 0x2060 && codepoint <= 0x2064) ||
    (codepoint >= 0x2066 && codepoint <= 0x206f) ||
    codepoint === 0x3164 ||
    (codepoint >= 0xfe00 && codepoint <= 0xfe0f) ||
    codepoint === 0xfeff ||
    codepoint === 0xffa0 ||
    (codepoint >= 0x1bca0 && codepoint <= 0x1bca3) ||
    (codepoint >= 0x1d173 && codepoint <= 0x1d17a) ||
    (codepoint >= 0xe0000 && codepoint <= 0xe0fff)
  );
}

/**
 * The *significant* scalars of one grapheme cluster: its codepoints with
 * default-ignorable/non-drawable controls removed (mirroring the Rust
 * `resolve_font_index`). Coverage decisions are driven by these; a cluster of
 * only ignorables has none.
 */
function significantScalars(cluster: string): number[] {
  const scalars: number[] = [];
  // `for...of` over a string iterates by codepoint, handling surrogate pairs.
  for (const char of cluster) {
    const codepoint = char.codePointAt(0)!;
    if (!isIgnorableForCoverage(codepoint)) scalars.push(codepoint);
  }
  return scalars;
}

/**
 * Binary-searches an ascending, non-overlapping list of inclusive ranges for
 * `codepoint`.
 */
function coversCodepoint(
  ranges: readonly FontCoverageRange[],
  codepoint: number,
): boolean {
  let lo = 0;
  let hi = ranges.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    const [start, end] = ranges[mid];
    if (codepoint < start) hi = mid - 1;
    else if (codepoint > end) lo = mid + 1;
    else return true;
  }
  return false;
}

/** Highest Unicode scalar value. */
const MAX_UNICODE_SCALAR = 0x10ffff;

/**
 * Validates the raw coverage JSON and builds a `manifestId -> ascending,
 * non-overlapping ranges` map.
 *
 * Hardening (any violation throws {@link GlyphFontCoverageLoadError} so the
 * caller degrades to loading the chain rather than silently rendering tofu):
 * - each range is a 2-tuple of integers within `[0, 0x10FFFF]` with
 *   `start <= end` (rejects fractional/out-of-range bounds);
 * - after sorting, ranges must not overlap or duplicate (a tolerated overlap
 *   would break {@link coversCodepoint}'s binary search);
 * - every configured chain id must appear exactly once (no missing/duplicate
 *   chain entries). Ids outside the configured chain are ignored.
 */
function parseCoverage(
  raw: FontCoverageResponse,
  chainSet: ReadonlySet<string>,
): Map<string, FontCoverageRange[]> {
  if (!raw || !Array.isArray(raw.fonts)) {
    throw new GlyphFontCoverageLoadError(
      "Font coverage response is missing a `fonts` array.",
    );
  }

  const byId = new Map<string, FontCoverageRange[]>();
  for (const entry of raw.fonts) {
    if (
      !entry ||
      typeof entry.id !== "string" ||
      !Array.isArray(entry.ranges)
    ) {
      throw new GlyphFontCoverageLoadError(
        "Font coverage entry is malformed (expected `{ id, ranges }`).",
      );
    }
    if (!chainSet.has(entry.id)) continue;
    if (byId.has(entry.id)) {
      throw new GlyphFontCoverageLoadError(
        `Font "${entry.id}" appears more than once in the coverage document.`,
      );
    }

    const ranges: FontCoverageRange[] = entry.ranges.map((range) => {
      if (
        !Array.isArray(range) ||
        range.length !== 2 ||
        !Number.isInteger(range[0]) ||
        !Number.isInteger(range[1]) ||
        range[0] < 0 ||
        range[1] > MAX_UNICODE_SCALAR ||
        range[0] > range[1]
      ) {
        throw new GlyphFontCoverageLoadError(
          `Font "${entry.id}" declares a malformed coverage range.`,
        );
      }
      return [range[0], range[1]];
    });
    // The contract promises ascending, non-overlapping order; sort defensively
    // then reject overlaps/duplicates so the binary search in
    // `coversCodepoint` is always correct.
    ranges.sort((a, b) => a[0] - b[0]);
    for (let i = 1; i < ranges.length; i++) {
      if (ranges[i][0] <= ranges[i - 1][1]) {
        throw new GlyphFontCoverageLoadError(
          `Font "${entry.id}" declares overlapping or duplicate coverage ranges.`,
        );
      }
    }
    byId.set(entry.id, ranges);
  }

  for (const chainId of chainSet) {
    if (!byId.has(chainId)) {
      throw new GlyphFontCoverageLoadError(
        `Coverage document is missing an entry for configured font "${chainId}".`,
      );
    }
  }
  return byId;
}

export class GlyphFontManager {
  private readonly shaper: FontRegisteringShaper;
  private readonly fontManifestIds: readonly string[];
  private readonly chainSet: ReadonlySet<string>;
  private readonly fetchBytes: (fontManifestId: string) => Promise<Uint8Array>;
  private readonly fetchCoverage: () => Promise<FontCoverageResponse>;

  /** Per-manifest-id registration cache (also dedupes concurrent callers). */
  private readonly registrations = new Map<string, Promise<FontId>>();

  /** Memoized, deduped coverage document (cleared on failure to allow retry). */
  private coveragePromise?: Promise<Map<string, FontCoverageRange[]>>;

  /**
   * Per-grapheme-cluster fallback decision cache: cluster string -> the chain
   * manifest id the shaper would resolve it to (or `null` when the cluster is
   * all-ignorable or genuinely uncoverable). Keyed alongside the coverage map
   * it was computed against so a coverage refresh transparently invalidates it,
   * and avoids re-scanning coverage ranges for repeated clusters on long lines.
   */
  private clusterDecisionCache = new Map<string, string | null>();
  private clusterDecisionCoverage?: ReadonlyMap<string, FontCoverageRange[]>;

  constructor(options: GlyphFontManagerOptions) {
    const {
      shaper,
      fontManifestIds = DEFAULT_GLYPH_FONT_CHAIN,
      baseUrl = DEFAULT_FONT_BASE_URL,
      coverageUrl = `${baseUrl.replace(/\/$/, "")}/coverage`,
      fetchImpl = fetch,
      fetchBytes,
      fetchCoverage,
    } = options;

    if (fontManifestIds.length === 0) {
      throw new GlyphFontLoadError(
        "(none)",
        "At least one font must be provided for the fallback chain.",
      );
    }

    this.shaper = shaper;
    this.fontManifestIds = [...fontManifestIds];
    this.chainSet = new Set(this.fontManifestIds);
    this.fetchBytes =
      fetchBytes ??
      ((fontManifestId) =>
        fetchFontBytes(fontManifestId, { baseUrl, fetchImpl }));
    this.fetchCoverage =
      fetchCoverage ?? (() => defaultFetchCoverage(coverageUrl, fetchImpl));
  }

  /** The configured ordered fallback chain (copy). */
  get chain(): readonly string[] {
    return this.fontManifestIds;
  }

  /** Whether `fontManifestId` has already been registered (or is in flight). */
  isRegistered(fontManifestId: string): boolean {
    return this.registrations.has(fontManifestId);
  }

  /**
   * Fetches (once) and memoizes the coverage document, keyed by manifest id.
   * Concurrent callers share one request; a failure clears the memo so a
   * subsequent call retries from scratch.
   */
  private ensureCoverage(): Promise<Map<string, FontCoverageRange[]>> {
    if (this.coveragePromise) return this.coveragePromise;

    const attempt = (async () => {
      const raw = await this.fetchCoverage();
      return parseCoverage(raw, this.chainSet);
    })();

    const tracked = attempt.catch((error) => {
      if (this.coveragePromise === tracked) {
        this.coveragePromise = undefined;
      }
      throw error;
    });
    this.coveragePromise = tracked;
    return tracked;
  }

  /**
   * Fetches + registers one chain font, caching the result per manifest id.
   * Concurrent callers dedupe onto the same in-flight promise; a failure clears
   * the cache entry so a retry can succeed. Ids are stable for the shaper's
   * lifetime (never unregistered).
   */
  private ensureRegistered(fontManifestId: string): Promise<FontId> {
    const existing = this.registrations.get(fontManifestId);
    if (existing) return existing;

    if (!this.chainSet.has(fontManifestId)) {
      // Never issue a byte request for an id outside the configured chain.
      return Promise.reject(
        new GlyphFontLoadError(
          fontManifestId,
          `Font id "${fontManifestId}" is not in the configured fallback chain.`,
        ),
      );
    }

    const attempt = (async () => {
      const bytes = await this.fetchBytes(fontManifestId);
      try {
        return this.shaper.registerFont(bytes);
      } catch (cause) {
        throw new GlyphFontLoadError(
          fontManifestId,
          `Failed to register font "${fontManifestId}" with the shaper (unparsable bytes?).`,
          undefined,
          cause,
        );
      }
    })();

    const tracked = attempt.catch((error) => {
      if (this.registrations.get(fontManifestId) === tracked) {
        this.registrations.delete(fontManifestId);
      }
      throw error;
    });
    this.registrations.set(fontManifestId, tracked);
    return tracked;
  }

  /**
   * Resolves the single chain manifest id the shaper would assign to one
   * grapheme `cluster` (see `resolve_font_index` in
   * `packages/glyph-renderer/src/shaping.rs`): the first chain font whose
   * declared coverage covers **all** the cluster's significant scalars; failing
   * that, the first chain font covering the **base** significant scalar; failing
   * that (uncoverable) or when the cluster is all-ignorable, `null`. Cached per
   * cluster for the current coverage map.
   */
  private resolveClusterFont(
    cluster: string,
    coverage: ReadonlyMap<string, FontCoverageRange[]>,
  ): string | null {
    if (this.clusterDecisionCoverage !== coverage) {
      this.clusterDecisionCache = new Map();
      this.clusterDecisionCoverage = coverage;
    }
    const cached = this.clusterDecisionCache.get(cluster);
    if (cached !== undefined) return cached;

    let decision: string | null = null;
    const significant = significantScalars(cluster);
    if (significant.length > 0) {
      // First chain font covering every significant scalar of the cluster.
      let chosen = this.fontManifestIds.find((id) => {
        const ranges = coverage.get(id);
        return (
          !!ranges &&
          significant.every((codepoint) => coversCodepoint(ranges, codepoint))
        );
      });
      // Failing that, the first covering the base scalar (marks may go missing,
      // exactly as the shaper's base-only fallback does).
      if (chosen === undefined) {
        const base = significant[0];
        chosen = this.fontManifestIds.find((id) => {
          const ranges = coverage.get(id);
          return !!ranges && coversCodepoint(ranges, base);
        });
      }
      decision = chosen ?? null;
    }

    this.clusterDecisionCache.set(cluster, decision);
    return decision;
  }

  /**
   * Walks `text` by extended grapheme cluster and returns the minimal ordered
   * (chain-order) subset of manifest ids the shaper needs to render every
   * coverable cluster — the exact fonts a coverage-aware selection must load.
   * Uncoverable clusters (emoji, private-use, …) and all-ignorable clusters
   * contribute nothing, so they never over-select an unrelated font.
   */
  private computeNeededFonts(
    text: string,
    coverage: ReadonlyMap<string, FontCoverageRange[]>,
  ): string[] {
    const needed = new Set<string>();
    for (const { segment } of graphemeSegmenter.segment(text)) {
      const fontId = this.resolveClusterFont(segment, coverage);
      if (fontId !== null) needed.add(fontId);
    }
    // Emit in chain order for a stable, fallback-correct request order.
    return this.fontManifestIds.filter((id) => needed.has(id));
  }

  /**
   * Ensures exactly the fonts `text` needs are fetched + registered, and
   * returns the ordered `fontIds`/`fontManifestIds` to pass to the shaper.
   *
   * Selection is resolved **per extended grapheme cluster** to match the Rust
   * shaper's fallback (`segment_by_fallback`/`resolve_font_index`): each cluster
   * needs a *single* font covering all its significant scalars (else its base),
   * and default-ignorable scalars (ZWJ/ZWNJ, variation selectors, bidi
   * controls, …) never trigger fallback. Empty text selects nothing (and needs
   * no coverage document). Clusters no chain font can cover are ignored without
   * throwing — they fall through to {@link escalateFallback} (or render as tofu).
   */
  async ensureFontsFor(text: string): Promise<GlyphFontSelection> {
    if (text.length === 0) {
      return { fontIds: [], fontManifestIds: [] };
    }

    const coverage = await this.ensureCoverage();
    const fontManifestIds = this.computeNeededFonts(text, coverage);
    const fontIds = await Promise.all(
      fontManifestIds.map((id) => this.ensureRegistered(id)),
    );
    return { fontIds, fontManifestIds };
  }

  /**
   * Cheap predicate letting the integration layer decide whether escalating on
   * a `missingFontRanges` report is worthwhile: resolves `true` only when the
   * cluster-aware selection for `text` needs a chain font that is not yet
   * registered — i.e. {@link escalateFallback} could actually improve the
   * layout. It uses the **identical** per-cluster logic as
   * {@link ensureFontsFor}, so the escalation predicate and the selection can
   * never disagree.
   *
   * With exact cmap-derived coverage, a `missingFontRanges` report usually
   * means "no chain font can render this" (an emoji, a private-use glyph, a
   * combining mark no single font shares with its base, …). Escalating there
   * would download the entire remaining chain — including the multi-megabyte
   * Source Han base — for characters no font could ever cover, defeating the
   * size goal. This predicate returns `false` for such genuinely uncoverable
   * text so the caller skips the pointless download and lets the characters
   * render as tofu.
   *
   * Reuses the memoized coverage document — no extra fetch. Returns `false` for
   * empty text and when the selection needs nothing new. If the coverage
   * document is *unavailable* (fetch/parse failed), this resolves `true`:
   * without a coverage map we cannot prove escalation is futile, so we prefer
   * letting the caller degrade to loading the chain over silently rendering
   * tofu.
   */
  async hasUnregisteredCoverageFor(text: string): Promise<boolean> {
    if (text.length === 0) return false;

    let coverage: ReadonlyMap<string, FontCoverageRange[]>;
    try {
      coverage = await this.ensureCoverage();
    } catch {
      // Coverage unavailable: we cannot prove escalation is futile, so let the
      // caller degrade to loading the chain rather than render tofu silently.
      return true;
    }

    return this.computeNeededFonts(text, coverage).some(
      (id) => !this.registrations.has(id),
    );
  }

  /**
   * Escalation path for when a layout still reports `missingFontRanges` despite
   * the coverage-selected chain: loads every chain member that is not yet
   * registered (in order), so a broad fallback font can rescue characters no
   * declared subset covered. Returns the full registered chain in order plus
   * `newlyLoaded` (empty when nothing was left to load).
   *
   * Idempotent and cheap once the whole chain is loaded: a second call fetches
   * nothing and reports `newlyLoaded: []`, letting a caller detect that another
   * re-layout would be pointless.
   */
  async escalateFallback(): Promise<GlyphFontEscalation> {
    const newlyLoaded = this.fontManifestIds.filter(
      (id) => !this.registrations.has(id),
    );

    // Kick off (deduped) registration for every not-yet-loaded chain member.
    await Promise.all(newlyLoaded.map((id) => this.ensureRegistered(id)));

    // Return the full chain in order. Every member is now registered (or was
    // already), so awaiting the cached promises is cheap.
    const fontManifestIds = [...this.fontManifestIds];
    const fontIds = await Promise.all(
      fontManifestIds.map((id) => this.ensureRegistered(id)),
    );
    return { fontIds, fontManifestIds, newlyLoaded };
  }
}

/** Default coverage fetcher: fetches and JSON-parses the coverage contract route. */
async function defaultFetchCoverage(
  coverageUrl: string,
  fetchImpl: typeof fetch,
): Promise<FontCoverageResponse> {
  let response: Response;
  try {
    response = await fetchImpl(coverageUrl);
  } catch (cause) {
    throw new GlyphFontCoverageLoadError(
      `Failed to fetch font coverage from ${coverageUrl}.`,
      undefined,
      cause,
    );
  }
  if (!response.ok) {
    throw new GlyphFontCoverageLoadError(
      `Font coverage route ${coverageUrl} responded ${response.status}.`,
      response.status,
    );
  }
  try {
    return (await response.json()) as FontCoverageResponse;
  } catch (cause) {
    throw new GlyphFontCoverageLoadError(
      `Font coverage route ${coverageUrl} returned an unparsable body.`,
      undefined,
      cause,
    );
  }
}
