/**
 * Whitelisted manifest of font binaries that this API package owns and
 * that are safe to expose to browser-side glyph shaping consumers (the
 * WASM glyph renderer under `packages/glyph-renderer` and any other raw
 * SFNT consumer that cannot inflate WOFF2).
 *
 * This module is intentionally free of Node built-ins (`fs`, `path`,
 * etc.) so it can be imported anywhere (route handlers, tests, tooling)
 * without pulling in filesystem access. Actual byte resolution lives in
 * `./server.ts`, which is the only module here that touches disk.
 *
 * IDs are the only untrusted input accepted by the delivery route: they
 * are looked up in `FONT_MANIFEST` and never used to build a filesystem
 * path directly, which rules out path traversal by construction.
 *
 * Jukebox owns a separate set of WOFF2 assets under
 * `packages/jukebox/src/fonts` (e.g. Inter Variable and the VF WOFF2s).
 * Those are private `next/font` build inputs and deliberately are not listed
 * here — this manifest only covers the raw SFNT chain that physically lives
 * in `packages/api/src/fonts`.
 */

export interface FontManifestEntry {
  /** Stable, URL-safe identifier. Never derived from user input. */
  id: string;
  /** File name within this package's `src/fonts` directory. */
  fileName: string;
  /** MIME type to send in the `Content-Type` response header. */
  contentType: string;
  /** Human-readable family name, for manifest listings/debugging. */
  family: string;
  /** Rough script coverage, for consumers picking a fallback chain. */
  script:
    | "latin"
    | "japanese"
    | "han-latin"
    | "thai"
    | "lao"
    | "hebrew"
    | "arabic"
    | "simplified-chinese"
    | "traditional-chinese";
  /**
   * True for formats every consumer (including WASM parsers that cannot
   * inflate WOFF2, e.g. some `ttf-parser`/`rustybuzz` based pipelines) can
   * read directly. OTF/TTF are `true`; WOFF2 is `false`.
   */
  rawSfnt: boolean;
  /**
   * Whether the binary is small enough to fetch eagerly on a lyrics view.
   * `false` marks multi-megabyte CJK fallback fonts that must only ever be
   * fetched lazily, on demand, once that renderer is actually selected.
   * The delivery route serves both alike; this is guidance for the
   * *consumer*.
   */
  eagerFetch: boolean;
}

/**
 * The whitelist. Add an entry here (and only here) to expose a new font
 * at `/api/fonts`. Nothing outside this list is servable. Only the raw
 * SFNT chain actually located in `packages/api/src/fonts` belongs here —
 * do not add Jukebox-owned WOFF2 assets.
 */
export const FONT_MANIFEST = [
  {
    // Inter Variable 4.1, taken verbatim from the upstream release archive
    // (rsms/inter, `InterVariable.ttf`), licensed under the SIL Open Font
    // License 1.1; see Inter-OFL.txt.
    //
    // Carries far more than Mona Sans for the same job: 2852 mapped code
    // points against 568, including 248 Cyrillic and 105 Greek where Mona has
    // 0 and 2 - and in a smaller file (~859 KiB vs ~1.31 MiB).
    //
    // Axes are `wght` 100-900 (default 400) and `opsz` 14-32 (default 14);
    // note the `opsz` range differs from Mona's 0-100, which is why callers
    // pass the real font size and let each face clamp to its own range. 2048
    // upem, and `sTypo` repeats `hhea` (1984 / -494), so it does not declare a
    // distinct typographic box - see `rubyVerticalMetrics.ts`.
    id: "inter-variable-ttf",
    fileName: "InterVariable.ttf",
    contentType: "font/ttf",
    family: "Inter Variable",
    script: "latin",
    rawSfnt: true,
    eagerFetch: true,
  },
  {
    // Upstream github/mona-sans `fonts/variable/MonaSansVF[wdth,wght,opsz,ital].ttf`,
    // licensed under the SIL Open Font License 1.1; see MonaSans-OFL.txt.
    // Default instance is wght=200 (Thin), so consumers wanting the Regular
    // weight must pass `wght=400` as a variation.
    //
    // Superseded by `inter-variable-ttf` in the glyph fallback chain (Latin
    // only: no Cyrillic, two Greek code points). Kept whitelisted so the chain
    // can be switched back without moving bytes around.
    id: "mona-sans-latin-otf",
    fileName: "Mona-Sans-VF.ttf",
    contentType: "font/ttf",
    family: "Mona Sans VF",
    script: "latin",
    rawSfnt: true,
    eagerFetch: true,
  },
  {
    // Full Source Han Sans variable OTF, decompressed from the repository's
    // WOFF2 copy so rustybuzz/ttf-parser can consume the raw SFNT bytes.
    // Licensed under the SIL Open Font License 1.1; see SourceHanSans-OFL.txt.
    id: "source-han-sans-vf-otf",
    fileName: "SourceHanSans-VF.otf",
    contentType: "font/otf",
    family: "Source Han Sans VF",
    script: "japanese",
    rawSfnt: true,
    eagerFetch: false,
  },
  {
    // PlanGothic P1 Regular 2.9.5795 from the project's official GitHub
    // release. It extends Source Han Sans across BMP and supplementary-plane
    // Han characters. Licensed under the SIL Open Font License 1.1; see
    // Plangothic-OFL.txt.
    id: "plangothic-p1-regular-ttf",
    fileName: "PlangothicP1-Regular.ttf",
    contentType: "font/ttf",
    family: "PlanGothic P1",
    script: "han-latin",
    rawSfnt: true,
    eagerFetch: false,
  },
  {
    // PlanGothic P2 Regular 2.9.5795 from the project's official GitHub
    // release. It carries later supplementary-plane Han extensions not present
    // in P1. Licensed under the SIL Open Font License 1.1; see
    // Plangothic-OFL.txt.
    id: "plangothic-p2-regular-ttf",
    fileName: "PlangothicP2-Regular.ttf",
    contentType: "font/ttf",
    family: "PlanGothic P2",
    script: "han-latin",
    rawSfnt: true,
    eagerFetch: false,
  },
  {
    // Noto Sans Thai Looped variable font from the Google Fonts repository,
    // licensed under the SIL Open Font License 1.1. The accompanying license
    // text is stored as NotoSansThaiLooped-OFL.txt in this directory.
    id: "noto-sans-thai-looped-vf-ttf",
    fileName: "NotoSansThaiLooped-VF.ttf",
    contentType: "font/ttf",
    family: "Noto Sans Thai Looped",
    script: "thai",
    rawSfnt: true,
    eagerFetch: true,
  },
  {
    // Noto Sans Lao Looped variable font from the Google Fonts repository.
    // Licensed under the SIL Open Font License 1.1; see
    // NotoSansLaoLooped-OFL.txt.
    id: "noto-sans-lao-looped-vf-ttf",
    fileName: "NotoSansLaoLooped-VF.ttf",
    contentType: "font/ttf",
    family: "Noto Sans Lao Looped",
    script: "lao",
    rawSfnt: true,
    eagerFetch: true,
  },
  {
    // Noto Sans Hebrew variable font from the Google Fonts repository.
    // Licensed under the SIL Open Font License 1.1; see NotoSansHebrew-OFL.txt.
    id: "noto-sans-hebrew-vf-ttf",
    fileName: "NotoSansHebrew-VF.ttf",
    contentType: "font/ttf",
    family: "Noto Sans Hebrew",
    script: "hebrew",
    rawSfnt: true,
    eagerFetch: true,
  },
  {
    // Noto Sans Arabic variable font from the Google Fonts repository.
    // Licensed under the SIL Open Font License 1.1; see NotoSansArabic-OFL.txt.
    id: "noto-sans-arabic-vf-ttf",
    fileName: "NotoSansArabic-VF.ttf",
    contentType: "font/ttf",
    family: "Noto Sans Arabic",
    script: "arabic",
    rawSfnt: true,
    eagerFetch: true,
  },
  {
    // Adobe's *official* region-specific subset variable font (Japan), taken
    // verbatim from the source-han-sans `release` branch
    // (Variable/OTF/Subset/SourceHanSansJP-VF.otf, Fonts Version 2.005R) so a
    // client can lazily fetch only the region font a run of text needs
    // instead of the ~30 MB full VF. Raw SFNT with the wght axis and the
    // OpenType features the renderer relies on (incl. palt). Licensed under
    // the SIL Open Font License 1.1; see SourceHanSans-OFL.txt.
    id: "source-han-sans-jp-vf",
    fileName: "SourceHanSansJP-VF.otf",
    contentType: "font/otf",
    family: "Source Han Sans JP VF",
    script: "japanese",
    rawSfnt: true,
    eagerFetch: false,
  },
  {
    // Adobe's official region-specific subset variable font for Simplified
    // Chinese (CN). See the JP entry above for provenance/licensing.
    id: "source-han-sans-sc-vf",
    fileName: "SourceHanSansCN-VF.otf",
    contentType: "font/otf",
    family: "Source Han Sans CN VF",
    script: "simplified-chinese",
    rawSfnt: true,
    eagerFetch: false,
  },
  {
    // Adobe's official region-specific subset variable font for Traditional
    // Chinese (TW). See the JP entry above for provenance/licensing.
    id: "source-han-sans-tc-vf",
    fileName: "SourceHanSansTW-VF.otf",
    contentType: "font/otf",
    family: "Source Han Sans TW VF",
    script: "traditional-chinese",
    rawSfnt: true,
    eagerFetch: false,
  },
] as const satisfies readonly FontManifestEntry[];

export type FontManifestId = (typeof FONT_MANIFEST)[number]["id"];

const FONT_MANIFEST_BY_ID: ReadonlyMap<string, FontManifestEntry> = new Map(
  FONT_MANIFEST.map((entry) => [entry.id, entry]),
);

/** Looks up a whitelisted font entry by ID, or `undefined` if unknown. */
export function getFontManifestEntry(
  id: string,
): FontManifestEntry | undefined {
  return FONT_MANIFEST_BY_ID.get(id);
}

/** All whitelisted font IDs, in manifest order. */
export const FONT_IDS: readonly FontManifestId[] = FONT_MANIFEST.map(
  (entry) => entry.id,
);
