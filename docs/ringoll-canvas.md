# Ringoll Canvas

A lyrics renderer that keeps [Ringoll](../packages/jukebox/src/components/public/lyrics/ringoll/)'s
scrolling architecture but paints its text with the WASM glyph engine described in
[`glyph-canvas-poc.md`](./glyph-canvas-poc.md), and adds three
[Apple Music-like Lyrics](https://github.com/amll-dev/applemusic-like-lyrics)
(AMLL) behaviours that DOM text cannot express well: a gradient karaoke sweep,
per-character emphasis with glow, and interlude dots.

Select it from the player's layout list as **"Ringoll Canvas"**. Like the PoC it is
lazily imported, so neither the shaper nor any font enters the bundle until it is
chosen.

## Why derive from Ringoll

Ringoll already solves the hard scrolling problems — spring-animated row positions,
depth blur, virtualization, hover, click-to-seek. Those stay **DOM**; only the text
painting moves to canvas, as one `<canvas>` per virtualized row. The alternative, a
single full-viewport canvas, would have meant reimplementing scrolling, blur and
hit-testing inside canvas for no visual gain.

## Architecture

```
RingollCanvasLyrics                 shell: measures the container, derives one
  └─ GlyphRuntimeProvider           shared font size, owns the runtime
       └─ LyricsVirtualizer         Ringoll's virtualizer, untouched
            ├─ RowRenderer          Ringoll's row chrome (spring/blur/role/…)
            │    ├─ GlyphLineCanvas one canvas per row
            │    │    └─ linePainter  pure paint decisions
            │    └─ translation     still DOM text
            └─ InterludeDots        DOM circles on the media clock
```

### Shared runtime

`glyph/glyphRuntime.tsx` hoists what the PoC used to own privately: one WASM init,
one `GlyphShaper`, one coverage-driven `GlyphFontManager`, one glyph outline cache,
one paragraph layout cache, and the **document-level** ruby vertical anchors (which
only produce a uniform ruby row if shared across every line).

It is deliberately **pull-based**: `selectionFor` and `layoutLine` are synchronous
and return `null` while fonts are still loading, and the runtime bumps a version
counter when work lands. Rows subscribe with `useGlyphRuntimeVersion` and re-render.
With a canvas per row there is no single "repaint everything" entry point to push to.

The PoC (`glyph/glyphCanvas.tsx`) was migrated onto the same runtime, so there is one
copy rather than two that drift.

`resetDocument()` clears escalation attempts, the non-fatal escalation error and the
ruby anchors when the lyrics document changes — registered fonts and their coverage
survive, since they are content-addressed and expensive to refetch. The provider's
cleanup calls `shaper.free()`; without it the module's linear memory keeps whole font
buffers (up to ~30 MB) alive after unmount.

## Ported AMLL behaviour

All constants below are taken from AMLL's `packages/core/src/lyric-player/` sources.

### Karaoke sweep

The reveal boundary is a soft gradient band, not a hard edge:

- Band width `fadeWidth = fontSize × 0.5`, **independent of word width**.
- Sung alpha `1.0`, unsung `0.4`; the whole line drops to `0.2` when inactive.
- Per-word progress is **linear with no easing** — AMLL notes explicitly that easing
  desynchronises word timing. Between words the front simply holds.

`ClusterRenderStyle.softEdgeWidth` implements this in `canvasGlyphRenderer.ts`. The
gradient is built in **cluster-local space**: `createLinearGradient` resolves against
the fill-time CTM, so each endpoint is pre-shifted by `-offset.x` to cancel the
per-glyph pen translation. That keeps the band continuous across a cluster's glyphs
and makes it ride the emphasis transform instead of sliding per glyph. Its far stop is
the active colour **at alpha 0** rather than the `transparent` keyword, which would
darken the band through premultiplied interpolation.

The front travels from `extent.left - fadeWidth/2` to `extent.right + fadeWidth/2`
(`karaokeSoftFillFront`), so the band is fully clear of the ink at both ends. This
matters: because the band is _centred_ on the front, travelling only across the
extent would leave the trailing half-band straddling the last glyphs at
`fraction === 1`, dimming every sung glyph permanently.

**Deviation from AMLL.** AMLL additionally pads a line's first glyph by
`+1.5 × fadeWidth` and its last by `+0.5 × fadeWidth`. That clearance is an artefact
of AMLL masking a whole _word span_ with one gradient; here the band is _cluster-local_
and already resolves completely at both ends, so the padding is not ported. The only
behaviour it would add is a slight timing shift (the front covering more distance in
the same time), which would require a line-level extent the painter does not carry.

### Emphasis

A word is emphasised when it lasts `≥ 1000 ms` (non-CJK additionally requires 2–7
characters). Emphasis is applied per **grapheme**:

```
du     = max(1000, wordDurationMs)
f(v)   = v > 1 ? sqrt(v) : v ** 3
amount = f(du / 2000) * 0.6      blur = f(du / 3000) * 0.5
last word of line: amount *= 1.6, blur *= 1.5, du *= 1.2
caps: amount <= 1.2, blur <= 0.8
```

With a symmetric envelope `e` peaking at the midpoint (two cubic-béziers), character
`i` of `n` gets `scale = 1 + 0.1·amount·e`, `translate = (−0.03·amount·e·(n/2 − i),
−0.025·amount·e)` em, staggered by `du / (2.5·n)` per index. The glow is white, radius
`min(0.3, 0.3·blur)` em, alpha `blur·e` — it **peaks with the scale**, and is painted
as an additive (`"lighter"`) blurred pass behind the text.

### Float — the most-seen animation

**Every** word, emphasised or not, rises `0 → −0.05 em` on a CSS `ease-out`
(`cubic-bezier(0, 0, 0.58, 1)`) over `max(1000 ms, wordDuration)`. It is a one-way
lift that **persists** (AMLL uses `fill: both`), not an entrance that returns to
identity.

Emphasised words add a half-sine bob of `0.05 em` over `1.4 × du`, started `400 ms`
early so its peak _leads_ the swell. Background/minor lines double **both** the float
and the bob (`0.1 em`).

The three vertical contributions — float, emphasis lift, bob — **sum** into one
`translate.y`; none replaces another.

> This is a different effect from the PoC's `clusterAnimation.ts`, which is an
> _entrance_ (px distances, keyed to reveal-front proximity, settling to identity).
> Do not conflate them.

### Interlude dots

Shown when a gap between lines is `≥ 4000 ms`, ending `250 ms` before the next line.
Three DOM circles — they need no text shaping, so canvas would buy nothing — animated
on the same media clock:

- group scale `0.7 × breathe × grow × endShrink`, where `breathe` oscillates ±5 % on a
  ~1500 ms cycle, `grow` is `easeOutExpo` over the first 2000 ms, and `endShrink`
  collapses over the last 750 ms with a small anticipation bump;
- group alpha hidden for 500 ms, ramping to 1 by 1000 ms, fading out over the last
  375 ms;
- each dot fills left-to-right from `0.25` to `1.0`, staggered by a third of the
  interlude.

They freeze while playback is paused.

**Blank lines count as instrumental time.** A line with no content renders nothing, so
bounding a gap with its timestamps would hide real interludes: a 10 s break authored as
`[sung] [blank] [sung]` splits into two sub-threshold halves and shows no indicator at
all, even though the listener sees ten silent seconds. `findInterludeGaps` therefore
skips contentless lines when locating boundaries and spans the gap through them.
A malformed line that _has content_ still blocks its boundary — a blank line has
trustworthy timing, a malformed one does not, so it must not dissolve into a gap whose
length we would then have to invent. A line that is both blank and malformed is dropped
like any other blank line, since its timing is never needed.

## Line states and colour

The reveal should read as **one boundary sweeping down the page**, so a future line is
painted at exactly the same colour as the not-yet-sung portion of the active line:

|                             | main text                            | translation  |
| --------------------------- | ------------------------------------ | ------------ |
| Active line, sung portion   | white `1.0`                          | white `0.75` |
| Active line, unsung portion | white `0.4`                          | —            |
| Passed line (fully swept)   | white `1.0`, then `×0.5` row opacity | white `0.75` |
| Future line (fully unsung)  | white `0.4`                          | white `0.3`  |

This is a **deviation from AMLL**, which additionally dims a non-active line to `0.2`.
Ringoll's row chrome already separates lines by depth — a distance-proportional blur on
every non-active row plus `opacity: 0.5` on passed ones — so AMLL's multiplier would put
a future line at `0.08` alpha and make it illegible. Dropping it also lines the canvas
renderer up with the DOM Ringoll it derives from, which shows passed lines at `0.5`.

The translation is always **one step behind its own line** (`×0.75` of whichever main
text alpha that row actually paints) rather than sitting at a fixed opacity. Note that
this follows the line's _reveal_ state, not `isActive`: a passed line is fully swept, so
its main text paints with the sung colour just like the active line's sung portion, and
only a future line is entirely unsung. Its
size is derived from the row's own main text — `max(14px, 0.5 × main)`, capped at the
main size. The floor is applied before the cap because on a narrow viewport a _minor_
line's main text is already near the responsive floor; legibility wins there, but a
translation must never render _larger_ than the line it translates.

## Line states and geometry

- **Becoming active scales the row `0.97 → 1`** (AMLL), driven by the same spring as
  `y`, so the change is one coordinated motion. The transform origin follows the row's
  role — top-left, top-right or top-centre — so the line grows outward from its own
  text anchor instead of drifting sideways.

  The scale sits on an **inner** box, never on the row element itself. The virtualizer
  measures rows with `getBoundingClientRect()`, which reports the _transformed_ box,
  while the `ResizeObserver` behind the re-measure watches `contentRect`, which is
  transform-blind and would never fire on a scale change. A scaled row would therefore
  cache `0.97 ×` its real height forever — and since a row mounts at
  `scale: isActive ? 1 : 0.97`, whichever row was active at mount would cache a
  _different_ height from every other row and skew every `top` below it. A transform on
  a child does not affect its parent's layout box.

- **A blank line reserves a 44 px row and renders no canvas.** 44 px is the smallest
  comfortable touch target in Apple's HIG, and the row owns the seek `onClick`. Skipping
  the canvas is what lets that minimum actually govern: `GlyphLineCanvas` falls back to
  an estimated height even with nothing to lay out, which together with the row padding
  already exceeded 44 px — so the blank row was only tappable by accident, while still
  paying for a canvas and a media-clock subscription to paint nothing.

## Discipline this renderer follows

- **Media clock only.** Every animated value is a pure function of a
  `PlaybackSnapshot` — never wall-clock time, never React state per frame, and no
  `requestAnimationFrame` loop of its own. Seeks, pauses and rate changes therefore
  redraw correctly for free.
- **No per-frame `setState`.** Canvas rows and the dots write to the DOM/canvas
  imperatively through refs. React state changes only when the _active gap_ or a row's
  _height_ changes.
- **Static lines are not repainted.** A row that is fully sung or fully unsung and not
  active short-circuits on a paint signature — this matters with 15–25 live canvases.
- **DPR is capped at 2** (`canvasPixelRatio`), since a canvas per row makes uncapped
  device pixel ratios expensive.
- **Glow bleeds outside the text box**, so each canvas is padded by
  `ceil(fontSize × 0.75)` on every side and offset by that margin. The _reported_
  height stays the bare text box, so the virtualizer measures layout, not bleed.

## Known limitations

- Row heights arrive asynchronously (fonts load, then layout resolves).
  `useRowMeasurement` only measures at mount and from the virtualizer's render cycle,
  so `RowRenderer` re-invokes the measurement ref on size change. Without that, rows
  overlap.
- The emphasis bob is modelled per word rather than per character; the 400 ms lead
  dominates the effect, so the simplification is not visible.
- Everything inherits the glyph engine's scope: horizontal, left-to-right text only —
  no vertical writing mode, no RTL ruby, no base-text justification.

## Further reading

- [`glyph-canvas-poc.md`](./glyph-canvas-poc.md) — the shaping/layout engine, font
  chain, ruby layout, and the platform research that led to it.
