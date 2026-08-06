# `@lyricova/glyph-renderer`

A WASM text shaping/layout **proof of concept** for Project Lyricova. Registers
font byte buffers and offers three levels of API, all backed by
[`rustybuzz`](https://github.com/harfbuzz/rustybuzz) (a pure-Rust port of
[HarfBuzz](https://harfbuzz.github.io/)) and its re-exported
[`ttf-parser`](https://github.com/harfbuzz/ttf-parser):

- **Single-run shaping** (`shape`) - shapes one contextual run with an explicit
  direction/script/language and returns positioned glyphs in true visual order
  (reversed for RTL, even across font-fallback segments) with logical source
  cluster ranges (in both UTF-8 bytes and UTF-16 code units). Line/paragraph
  separators and bidi controls emit no glyph or advance.
- **Deterministic horizontal paragraph layout** (`layoutParagraph`) - runs
  Unicode bidi segmentation (UAX #9) on a whole paragraph, applies
  grapheme-cluster-aware font fallback, shapes each directional run, groups
  glyphs into safe shaped clusters (ligatures / combining sequences) with
  advance and bounding-box metadata, and wraps the result into visually-ordered
  lines at legal UAX #14 break opportunities under an optional width
  constraint - ready to be handed to a canvas/WebGL/WebGPU renderer.
- **Scalable glyph outline extraction** (`glyphOutline`) - returns a single
  registered font glyph's filled vector contour as `Path2D`-style path commands
  plus a tight ink bounding box, scaled to a requested font size (with optional
  variable-font settings matching shaping), so a renderer can rasterize the
  glyphs it shaped/laid out.

Ruby annotations, glyph _rasterization_, and color/bitmap glyphs are
intentionally out of scope for this PoC; `glyphOutline` extracts **monochrome
vector outlines only** (see "Known limitations").

> This crate is a shaping/layout engine only; for the jukebox lyrics renderer
> that consumes it (selection, ruby placement, karaoke/cluster animation,
> font delivery, and the platform research behind this whole PoC), see
> [`docs/glyph-canvas-poc.md`](../../docs/glyph-canvas-poc.md) at the repo
> root.

## Why `rustybuzz`, not `cosmic-text`

The brief asked us to evaluate [`cosmic-text`](https://github.com/pop-os/cosmic-text)
first and only fall back to a smaller stack if it couldn't deliver the
required contract. Both were empirically checked against a `wasm32-unknown-unknown`
target before deciding (not just read about):

- **`cosmic-text` does compile cleanly for `wasm32-unknown-unknown`** (verified
  with `cargo check --target wasm32-unknown-unknown` against `cosmic-text
0.12`), and its low-level `ShapeLine`/`ShapeGlyph` API (`src/shape.rs` in the
  crate) _does_ expose exactly the cluster metadata we need: `start`/`end`
  byte ranges, `glyph_id`, `x_advance`/`y_advance`, `x_offset`/`y_offset`. Font
  bytes can be loaded in-memory via `FontSystem::new_with_locale_and_db` +
  `fontdb::Database::load_font_data`, with no filesystem/system-font-catalog
  access required.
- **However, `cosmic-text`'s public `Attrs` type (`src/attrs.rs`) has no way
  to express OpenType feature settings, variable-font axis values, an explicit
  BCP-47 language override, or an explicit paragraph direction override** -
  only `family`/`stretch`/`style`/`weight`/`color`/`metadata`/`metrics`.
  Direction is bidi-only (inferred, not settable) and script/language are not
  request-level inputs at all. That's a hard blocker for this package's
  required contract ("accept direction/language/feature/variation inputs...
  in the public contract"), not a hypothetical one - we would have had to
  patch or fork `cosmic-text` to add them.
- **`rustybuzz`** (which `cosmic-text` itself uses internally as its shaping
  backend) exposes all of these directly and idiomatically: `UnicodeBuffer::set_direction/set_script/set_language`,
  `rustybuzz::shape(face, features, buffer)` where `features: &[Feature]`
  parses HarfBuzz-style strings (`"liga=1"`, `"-kern"`, `"salt[3:5]=2"`), and
  `Face::set_variations(&[Variation])` for variable-font axes
  (`"wght=650"`). It also compiles cleanly for `wasm32-unknown-unknown` with a
  much smaller dependency tree than `cosmic-text` (no `fontdb`, `rayon`,
  `swash`, or `skrifa`/COLR raster stack - none of which this package needs).
  This matches the brief's explicit fallback option: "a smaller
  HarfBuzz-based implementation" - `rustybuzz` _is_ that implementation
  (a complete, from-scratch Rust port of HarfBuzz's shaping algorithm, not a
  wrapper/binding).

In short: `cosmic-text` bundles a whole rich-text editor/layout stack but
can't express this package's required per-run shaping inputs
(direction/script/language/feature/variation overrides). We instead take
`rustybuzz` for shaping and add a _thin, purpose-built_ paragraph layer on top
of it (bidi via `unicode-bidi`, line breaks via `unicode-linebreak`, grapheme
segmentation via `unicode-segmentation`, script itemization via
`unicode-script`) - giving full control over shaping inputs and deterministic
behavior without the extra layout-engine weight.

## Package layout

```
Cargo.toml            Rust crate (crate-type = ["cdylib", "rlib"])
src/
  shaping.rs           Core single-run shaping engine + font registry (no wasm-bindgen; testable natively)
  layout.rs            Paragraph layout: bidi, UAX #14 line breaking, width wrapping, cluster grouping
  outline.rs           Scalable per-glyph vector outline extraction (path commands + bounds; monochrome)
  bindings.rs          wasm-bindgen bindings exposing `GlyphShaper` + `lineBreakOpportunities` to JS
  lib.rs               Crate root, re-exports
tests/
  shaping_tests.rs      Single-run shaping integration tests (native `cargo test`)
  layout_tests.rs       Paragraph layout integration tests (bidi/wrapping/clusters/UTF-16/fallback)
  outline_tests.rs      Glyph outline extraction tests (scaling/bounds/whitespace/validation)
                        Tests read existing fixtures from packages/api/src/fonts
ts/
  types.ts               Hand-written TS contracts mirroring the Rust structs (ShapeRequest/ParagraphRequest/...)
  index.ts               Typed wrapper class (`GlyphShaper`) + `initGlyphRenderer()` + `lineBreakOpportunities()`
pkg/                    wasm-pack build output (gitignored - regenerate with `npm run build:wasm`)
build/                  tsc build output (gitignored - regenerate with `npm run build:ts`)
```

## Build & test commands

`cargo test`/`cargo check` only need a plain Rust toolchain (host target, no
wasm32). `npm run build:wasm`/`npm run typecheck`/`npm run build` additionally
need the `wasm32-unknown-unknown` target and `wasm-pack`
(the latter is a package-local `devDependency` here - an npm-distributed
launcher that fetches the matching prebuilt binary, so no separate global
install/curl script is required once `npm install` has run for this
workspace; `npx wasm-pack --version` works standalone too).

```sh
# One-time local setup. CI provisions stable Rust and this target automatically:
rustup target add wasm32-unknown-unknown
# NOTE: use rustup, not the OS package manager - e.g. Debian/Ubuntu's `apt`
# `rustc` package is version 1.63, far too old for this crate's dependencies
# (edition 2021 + current wasm-bindgen/rustybuzz require a current stable
# toolchain; this was developed against rustc/cargo 1.97.1 via rustup).

# From packages/glyph-renderer/:
cargo check                 # fast native compile check
cargo test                  # 63 native integration tests (shaping_tests.rs + layout_tests.rs + outline_tests.rs)
npm run build:wasm          # wasm-pack build --target web --out-dir pkg
npm run typecheck           # bootstraps missing/stale artifacts, then `tsc --noEmit`
npm run build               # build:wasm then build:ts -> pkg/ + build/
npm run test                # Rust tests, then the TypeScript/Vitest suite
```

Verified in this environment: `cargo check`, `cargo test` (70/70 passing),
`cargo fmt --check` and `cargo clippy --all-targets -- -D warnings` (both
clean), `wasm-pack build --target web` (produces a working
`pkg/glyph_renderer_bg.wasm`), `tsc --noEmit`/`tsc` and `eslint ts` against
the generated bindings, and an end-to-end smoke test driving the compiled
`build/index.js` -> `pkg/glyph_renderer.js` -> `pkg/glyph_renderer_bg.wasm`
chain from Node (registering two fonts; shaping mixed Latin+Hiragana+astral
text with UTF-16 offsets and an OpenType feature; laying out a wrapped,
bidi-reordered paragraph; querying `lineBreakOpportunities`; and confirming a
thrown `Error` on invalid input).

## Public API

```ts
import { initGlyphRenderer, GlyphShaper } from "@lyricova/glyph-renderer";
import type { ShapeRequest, ShapeResult } from "@lyricova/glyph-renderer";

await initGlyphRenderer(); // fetches pkg/glyph_renderer_bg.wasm relative to this module

const shaper = new GlyphShaper();
const fontId = shaper.registerFont(await fetchFontBytes(), /* faceIndex */ 0);

const result: ShapeResult = shaper.shape({
  text: "Héllo",
  fontIds: [fontId], // ordered, explicit fallback chain
  direction: "auto", // "ltr" | "rtl" | "ttb" | "btt" | "auto"
  script: null, // ISO 15924, e.g. "Latn"; null = auto-detect
  language: null, // BCP-47, e.g. "en-US"; null = auto-detect
  features: ["liga=1", "kern=1"], // HarfBuzz-style feature strings
  variations: ["wght=650"], // variable-font axis settings
  fontSize: 16,
} satisfies ShapeRequest);

for (const g of result.glyphs) {
  // g.glyphId, g.fontId, g.cluster/g.clusterEnd (source UTF-8 byte range),
  // g.clusterUtf16/g.clusterEndUtf16 (same range in UTF-16 code units),
  // g.xAdvance/g.yAdvance/g.xOffset/g.yOffset
}
```

See `ts/types.ts` for the full contract and `src/shaping.rs` for the Rust
implementation/doc comments.

### Paragraph layout

For a whole paragraph (mixed direction, wrapping, cluster grouping) use
`layoutParagraph`:

```ts
import {
  initGlyphRenderer,
  GlyphShaper,
  lineBreakOpportunities,
} from "@lyricova/glyph-renderer";
import type {
  ParagraphRequest,
  ParagraphLayout,
} from "@lyricova/glyph-renderer";

await initGlyphRenderer();
const shaper = new GlyphShaper();
const latin = shaper.registerFont(await fetchLatin(), 0);
const kana = shaper.registerFont(await fetchKana(), 0);

const layout: ParagraphLayout = shaper.layoutParagraph({
  text: "Hello \u3053\u3093\u306B\u3061\u306F world",
  fontIds: [latin, kana], // ordered, explicit fallback chain
  baseDirection: "auto", // "ltr" | "rtl" | "auto" (vertical is rejected)
  script: null, // explicit ISO 15924 or null = guess per run
  language: null, // explicit BCP-47 or null = guess per run
  features: ["liga=1"], // preserved OpenType features
  variations: ["wght=650"], // preserved variable-font axes
  fontSize: 32,
  maxWidth: 240, // omit/null/<=0 => break only at newlines
  wrapStrategy: "balanced", // "greedy" (default) or balanced line widths
  lineHeight: null, // null => derive from primary font metrics
  noBreakRanges: [[6, 10]], // optional: logical UTF-16 [start,end) spans that must not be split
  phraseRanges: [[11, 16]], // optional: soft phrase spans whose inner breaks are discouraged
} satisfies ParagraphRequest);

for (const line of layout.lines) {
  // line.top / line.baseline / line.height, line.width, line.hardBreak
  for (const cluster of line.clusters) {
    // cluster.source.{utf8Start,utf8End,utf16Start,utf16End} - logical range
    // cluster.x / cluster.advance / cluster.bounds - for paint & animation
    // cluster.fontId / cluster.direction / cluster.level / cluster.glyphs
  }
}

// Standalone UAX #14 opportunities (no font required, but init() first):
const breaks = lineBreakOpportunities("some text\n"); // [{ utf8Index, utf16Index, mandatory }]
```

- **Source correlation**: every cluster/glyph reports its logical source range
  in **both** UTF-8 bytes and UTF-16 code units, so a DOM/JS caller (whose
  string indices are UTF-16, e.g. Jukebox lyric attachment indices) can
  correlate layout items to source characters without re-deriving the mapping.
- **Bidi**: mixed LTR/RTL paragraphs are segmented with the maintained
  [`unicode-bidi`](https://crates.io/crates/unicode-bidi) crate; the base
  direction is tracked **per Unicode paragraph** (`auto` resolves each
  paragraph's direction from its own first strong character), and each line is
  reordered with its own paragraph's base level. Each line's clusters are
  returned in **visual** order while keeping their logical source ranges,
  resolved embedding `level`, per-line base `direction`, and resolved ISO
  15924 `script`.
- **Script itemization**: within each bidi/font run, text is further split by
  script (UAX #24, with `Common`/`Inherited` attaching to the surrounding
  script) so a same-font, same-direction mix (e.g. Latin + Greek, or Hebrew +
  Arabic) shapes each sub-run under its correct script.
- **Control characters**: line/paragraph separators (LF, CR, CRLF, LS, PS) and
  bidi format controls keep their source range and drive line breaking, but
  emit **no glyph and no advance** and are never reported as missing coverage.
- **Line breaking**: legal break opportunities come from
  [`unicode-linebreak`](https://crates.io/crates/unicode-linebreak) (UAX #14);
  both strategies break only at cluster boundaries (words at spaces, CJK
  between ideographs). `"greedy"` is first-fit and remains the API default.
  `"balanced"` preserves greedy's line count, then uses dynamic programming to
  redistribute legal breakpoints and minimize line-width variance. Overflow
  and emergency breaks are penalized ahead of visual balance. Candidate widths
  use prefix sums; exceptionally large paragraphs whose DP search would exceed
  the built-in work budget fall back to greedy wrapping. Trailing whitespace
  is excluded from `line.width`.
- **Clusters**: ligatures and base+mark/ZWJ combining sequences are grouped
  into a single `ShapedCluster` with `advance` and ink `bounds` metadata.
- **Validation**: `fontSize` and a supplied `lineHeight` must be finite and
  positive; `maxWidth` must be finite (a non-positive `maxWidth` means "no
  wrapping"). NaN/Infinity/negative inputs throw.
- **Break suppression** (`noBreakRanges`): optional logical **UTF-16**
  `[start, end)` spans inside which line breaking is forbidden - e.g. a
  ruby-annotated base run that a higher layer must keep on one line without
  reimplementing UAX #14. Only width-driven and emergency breaks are
  suppressed; legal breaks exactly _before_ `start` and _after_ `end` are
  preserved and mandatory (hard newline) breaks are always honored. Endpoints
  are validated strictly (`start < end`, within the text, on code-point
  boundaries); an invalid range throws. Overlapping ranges are unioned.
- **Phrase preferences** (`phraseRanges`): optional logical UTF-16 spans whose
  interior UAX #14 breaks are penalized rather than forbidden. The greedy
  strategy first tries a phrase boundary, then falls back to an internal legal
  break if the phrase is wider than the line. Balanced wrapping applies the
  same preference ahead of line-width variance. This is the integration point
  used by Jukebox's BudouX-based auto-phrase support.

### Glyph outlines

For a renderer that needs to _draw_ the glyphs it shaped/laid out, `glyphOutline`
returns a single registered glyph's scalable filled contour:

```ts
import { initGlyphRenderer, GlyphShaper } from "@lyricova/glyph-renderer";
import type {
  GlyphOutlineRequest,
  GlyphOutline,
} from "@lyricova/glyph-renderer";

await initGlyphRenderer();
const shaper = new GlyphShaper();
const fontId = shaper.registerFont(await fetchFontBytes(), 0);

// glyphId typically comes from a shaped PositionedGlyph / ShapedCluster.
const outline: GlyphOutline | null = shaper.glyphOutline({
  fontId,
  glyphId: 42,
  fontSize: 64, // outline is scaled to this size
  variations: ["wght=650"], // optional; MUST match what you shaped with
} satisfies GlyphOutlineRequest);

if (outline) {
  const path = new Path2D();
  for (const c of outline.commands) {
    if (c.type === "moveTo") path.moveTo(c.x, c.y);
    else if (c.type === "lineTo") path.lineTo(c.x, c.y);
    else if (c.type === "quadTo") path.quadraticCurveTo(c.x1, c.y1, c.x, c.y);
    else if (c.type === "cubicTo")
      path.bezierCurveTo(c.x1, c.y1, c.x2, c.y2, c.x, c.y);
    else path.closePath();
  }
  // outline.bounds (xMin/xMax/yMin/yMax), outline.unitsPerEm, outline.scale
}
```

- **Coordinate system**: coordinates are in `fontSize` units with the origin at
  the glyph pen position and **`y` growing up** (font convention - matching
  `ShapedCluster.bounds` and a glyph's `yOffset`). A canvas renderer (whose `y`
  grows _down_) applies the axis flip itself; the outline is returned in the
  same space the shaper positions glyphs in, so the two compose directly.
- **Path commands** mirror the Canvas2D `Path2D` API (`moveTo`/`lineTo`/
  `quadTo`->`quadraticCurveTo`/`cubicTo`->`bezierCurveTo`/`close`), so they can
  be replayed into a `Path2D` (or a WebGL/WebGPU tessellator) without touching
  font-unit coordinates.
- **No outline -> `null`**: whitespace (a space glyph) and glyphs defined only
  via color/bitmap/SVG tables return `null` (they have no monochrome contour to
  draw).
- **Validation**: throws on an unknown `fontId`, an out-of-range `glyphId`, a
  non-positive/non-finite `fontSize`, or an unparsable `variations` string. The
  `variations` should match the values used for shaping so the interpolated
  outline lines up with the shaped advances/offsets.
- **Monochrome only**: see "Known limitations" - color/bitmap glyphs are not
  extracted.

A ready-made browser Canvas2D consumer of `layoutParagraph` + `glyphOutline`
lives in the Jukebox package under
`src/components/public/lyrics/glyph/` (`glyphOutlineCache.ts` caches/reuses
`Path2D`s; `canvasGlyphRenderer.ts` paints each safe cluster with independent
transform/opacity and a karaoke fill; `canvasGlyphGeometry.ts` holds the pure
transform math). It is deterministic and stateless per paint - playback timing
is injected by the caller from the media clock, not an internal RAF.

### Font fallback

Fallback is **explicit and deterministic**, not automatic/system-driven: the
caller supplies an ordered `fontIds` list. Fallback is resolved per **extended
grapheme cluster** (never per raw scalar): for each cluster the first font
covering all of its significant scalars wins; failing that, the first font
covering the cluster's base scalar; failing that, the _last_ font in the list.
Because resolution is per grapheme cluster, a base character and its combining
marks / ZWJ-joined sequence are **never split across two different fonts**.
Coverage is reported honestly at scalar granularity in `missingFontRanges`:
any significant scalar the assigned font cannot render is reported - including
a combining mark a base-only fallback font lacks (degraded coverage), rather
than falsely claiming full coverage. Default-ignorable and non-drawable
control scalars are never reported. There is no Unicode-block/locale-based
automatic fallback and no system font catalog access (fonts only ever come
from bytes the caller registers) - this keeps behavior deterministic and
portable to a sandboxed wasm environment, at the cost of requiring the caller
to know which fonts to register and in what order.

## Known limitations

- **Horizontal layout only.** `layoutParagraph` implements horizontal
  paragraph layout; vertical writing modes (`ttb`/`btt` as a paragraph base
  direction) are rejected. (`shape()` still accepts `ttb`/`btt` for a single
  run.)
- **No ruby / interlinear annotation layout.** Only glyph IDs, positions,
  advances, and (metrics-derived) cluster bounding boxes come out of
  `layoutParagraph`. Vector outlines are available separately via
  `glyphOutline` (see above); a renderer can request them for the glyph IDs it
  shaped.
- **Glyph outlines are monochrome vector contours only.** `glyphOutline`
  extracts TrueType `glyf` / CFF / CFF2 outlines (including the variable-font-
  interpolated result), scaled to a font size, `y`-up. It does **not**
  rasterize, and it ignores color (`COLR`/`CPAL`), bitmap (`CBDT`/`sbix`) and
  `SVG ` glyphs - those return `null` like a blank glyph. A renderer wanting
  color glyphs must read those tables itself from `rustybuzz`'s re-exported
  `ttf_parser::Face`.
- **Balanced wrapping is not full typesetting.** It balances UAX #14
  breakpoints while preserving the greedy line count; there is no
  Knuth-Plass paragraph shaping, hyphenation dictionary, or line-break
  tailoring beyond the `unicode-linebreak` defaults. Very large candidate
  searches deliberately fall back to greedy wrapping to protect the browser
  main thread. Alignment/justification is left to the caller (each line
  reports `width`, `trailingWhitespace`, and base `direction`).
- **Variable-font axis values apply uniformly to whichever font renders a
  given run**; an axis absent from a particular fallback font is silently
  ignored (standard variable-font behavior, but worth calling out since
  fallback can span multiple fonts in one call).
- **No shape plan/buffer caching across calls.** Each call performs a fresh
  HarfBuzz-equivalent shaping pass; for high-frequency re-shaping of the same
  content (e.g. per-frame re-layout) a caller-side cache keyed on the full
  request is recommended.
- **No color font (COLR/CPAL/emoji bitmap) extraction** - only monochrome
  glyph IDs/positions are returned; a renderer wanting color glyphs needs to
  read `COLR`/`CPAL`/`CBDT` tables itself.
- **Structured error variants are not preserved across the wasm boundary.**
  `src/shaping.rs::ShapeError` is a proper enum internally, but
  `src/bindings.rs::to_js_error` currently stringifies it into a plain JS
  `Error.message` (see `ts/types.ts::ShapeErrorKind` for the taxonomy). Fine
  for this proof of concept; a future iteration could serialize the tagged
  enum instead if callers need to branch on error kind programmatically.

## Root integration notes (for the parent agent)

This package was built and validated entirely within
`packages/glyph-renderer/` using a **package-local `Cargo.lock`** (no root
manifests were touched). To make `npm run build`/`test`/`typecheck` work for
this package in CI/dev environments, the parent will need to additionally
provision, outside this package's control:

1. **A Rust toolchain via [`rustup`](https://rustup.rs/)** (stable; developed
   against `rustc`/`cargo` 1.97.1) with the `wasm32-unknown-unknown` target
   (`rustup target add wasm32-unknown-unknown`). **Do not install Rust via the
   OS package manager** - e.g. Debian/Ubuntu's `apt` `rustc` package was
   observed to be a very old `1.63.0`, well below what this crate's
   dependencies (`wasm-bindgen 0.2.126`, `rustybuzz 0.20`, edition 2021)
   require.
2. **`npm install` at the repo root** so npm workspaces links this package's
   `devDependencies`, notably `wasm-pack` (an npm-distributed launcher, no
   separate global/curl install needed - confirmed `npx wasm-pack@0.15.0`
   works standalone too). This will update the root `package-lock.json`,
   which I deliberately did not run/modify myself per the task's
   instructions to leave root-manifest changes to the parent.
3. `cargo test`/`cargo check` need no extra target (they run on the host
   target), only the base Rust toolchain above.
4. This package intentionally has **no root `turbo.json`/root `package.json`
   changes** - turbo will simply skip tasks this package doesn't define
   (there is no `dev` script, for example) which is standard turborepo
   behavior, and the workspace's `workspaces: ["packages/*"]` glob already
   picks this package up automatically.
