import type { FontId } from "@lyricova/glyph-renderer";
import type { RubyLayoutShaper } from "./types";

/**
 * Vertical anchors for ruby placement, derived from the `OS/2` **sTypo**
 * metrics of the fonts that are actually used.
 *
 * The layout engine reports `ParagraphLayout.ascent`/`descent` from the *first*
 * font of the chain using `hhea`, which is the wrong anchor for ruby in two
 * ways:
 *
 * - It depends on chain order, not on what shaped the text. A coverage-driven
 *   selection puts the Latin font first whenever a line contains one Latin
 *   character, so an otherwise identical Japanese line changes line height
 *   depending on its content.
 * - `hhea` is a *line box*, not a typographic top. Source Han Sans reports
 *   1.160 em there but its ideographic em box - where ideographs, kana and
 *   Hangul actually live - tops out at 0.880 em, so ruby placed against `hhea`
 *   floats 0.210 em higher than the characters it annotates.
 *
 * `sTypoAscender`/`sTypoDescender` give the right box **for fonts that fill it
 * in properly**: for Source Han they are exactly the ideographic em box
 * (880 / -120 per 1000 upem).
 *
 * Not every font does. Mona Sans reports `sTypo` identical to its `hhea`
 * (1090 / -320) - a *line box*, the very thing this anchor rejects `hhea` for,
 * and 0.210 em taller than Source Han's. Because `baseAscentEm` is a `max`
 * shared across the document, a single Latin ruby base was enough to lift the
 * ruby row of *every* line by that much.
 *
 * A font whose `sTypo` box is byte-identical to its `hhea` box has effectively
 * declined to declare a typographic box (the `OS/2` spec permits copying, and
 * many Latin faces do). Only for those fonts is the reservation capped by the
 * ink the annotated bases actually produce - see
 * {@link ResolveRubyVerticalMetricsOptions.baseInkAscentEm}. Fonts that *do*
 * declare a distinct box keep it verbatim, so Source Han still anchors ruby to
 * the ideographic em box rather than to whichever kanji happen to be on the
 * line - which is what JLReq specifies and what keeps ruby height stable
 * regardless of content.
 *
 * **`sTypo` is not an ink bound.** Source Han's own Latin coverage reaches 995
 * and -244 per 1000 upem, well past its box. `measureTypoBoxOverflow` reports
 * when text actually crosses it so the clearance can be tuned (see `rubyGap`)
 * rather than silently colliding.
 */
export interface RubyVerticalMetrics {
  /**
   * Highest point base ink is expected to reach above the base baseline, as a
   * fraction of the base font size. `max` over the fonts shaping *annotated*
   * base ranges - unannotated runs are irrelevant, since no ruby sits above
   * them.
   */
  baseAscentEm: number;
  /** Ruby ascent above the ruby baseline, as a fraction of the ruby font size. */
  rubyAscentEm: number;
  /** Ruby descent below the ruby baseline (positive), as a fraction of the ruby font size. */
  rubyDescentEm: number;
}

/** A ruby font whose ink actually reaches into the base text below it. */
export interface RubyClearanceLoss {
  fontId: FontId;
  /** How far ruby ink and base ink overlap, in layout units. */
  overlap: number;
}

type MetricsShaper = Pick<RubyLayoutShaper, "fontMetrics">;

/**
 * Em-relative `sTypo` box of one font, falling back to `hhea` when the font's
 * `OS/2` table predates `sTypo*` (v0 tables) or reports a degenerate box.
 */
/**
 * Whether the font declares a typographic box *distinct* from its line box.
 *
 * `OS/2` allows `sTypoAscender`/`sTypoDescender` to simply repeat
 * `hhea.ascender`/`descender`, which many Latin faces (Mona Sans included) do.
 * Such a font has told us nothing about where its text actually sits, so the
 * caller may fall back to measured ink; a font that does declare a real box
 * (Source Han's ideographic em box) is authoritative and used as-is.
 */
export function declaresTypoBox(
  shaper: MetricsShaper,
  fontId: FontId,
): boolean {
  const m = shaper.fontMetrics(fontId);
  const typoAscender = m.typoAscender ?? null;
  const typoDescender = m.typoDescender ?? null;
  if (typoAscender === null || typoDescender === null) return false;
  // A zero/inverted box is unusable, matching `typoBoxEm`'s own fallback.
  if (!(typoAscender > 0 && typoDescender < 0)) return false;
  return typoAscender !== m.ascender || typoDescender !== m.descender;
}

export function typoBoxEm(
  shaper: MetricsShaper,
  fontId: FontId,
): { ascentEm: number; descentEm: number } {
  const m = shaper.fontMetrics(fontId);
  const upem = m.unitsPerEm > 0 ? m.unitsPerEm : 1000;
  const ascender = m.typoAscender ?? m.ascender;
  const descender = m.typoDescender ?? m.descender;
  // A zero or inverted box is unusable; fall back rather than collapse the row.
  const usable = ascender > 0 && descender < 0;
  return {
    ascentEm: (usable ? ascender : m.ascender) / upem,
    descentEm: -(usable ? descender : m.descender) / upem,
  };
}

/**
 * Aggregates the anchors over the fonts actually used: the widest base box that
 * any annotated range needs, and the deepest ruby box any ruby run needs.
 *
 * Both font sets must be the *used* ones, not the whole fallback chain -
 * including a chain member that shaped nothing would reintroduce exactly the
 * chain-order dependency this exists to remove.
 *
 * Returns `null` when neither set has a member, leaving the caller to fall back
 * to paragraph metrics.
 */
export interface ResolveRubyVerticalMetricsOptions {
  /**
   * Tallest ink each base font actually produces across the paragraph's
   * *annotated* ranges, as a fraction of the base font size.
   *
   * Applied **only** to fonts that declare no distinct typographic box (their
   * `sTypo` equals their `hhea`), which then reserve
   * `min(sTypoAscender, measured ink)`. Mona Sans fills `sTypo` with its line
   * box (1.090 em) though its capitals reach just 0.729 em, and a `max` over
   * fonts would otherwise let that one font lift the ruby row for the whole
   * document.
   *
   * Fonts with a real typographic box - Source Han's ideographic em box - are
   * never capped: ruby belongs above the em box, not above whichever glyphs the
   * line happens to contain.
   *
   * A font missing from the map, or measuring no ink at all (a fully blank
   * annotated range), also falls back to its `sTypo` box.
   */
  baseInkAscentEm?: ReadonlyMap<FontId, number>;
}

export function resolveRubyVerticalMetrics(
  shaper: MetricsShaper,
  baseFontIds: Iterable<FontId>,
  rubyFontIds: Iterable<FontId>,
  options: ResolveRubyVerticalMetricsOptions = {},
): RubyVerticalMetrics | null {
  let baseAscentEm = 0;
  let sawBase = false;
  for (const fontId of baseFontIds) {
    const typoAscentEm = typoBoxEm(shaper, fontId).ascentEm;
    const inkAscentEm = options.baseInkAscentEm?.get(fontId);
    const capByInk =
      !declaresTypoBox(shaper, fontId) &&
      inkAscentEm !== undefined &&
      inkAscentEm > 0;
    baseAscentEm = Math.max(
      baseAscentEm,
      capByInk ? Math.min(typoAscentEm, inkAscentEm) : typoAscentEm,
    );
    sawBase = true;
  }

  let rubyAscentEm = 0;
  let rubyDescentEm = 0;
  let sawRuby = false;
  for (const fontId of rubyFontIds) {
    const box = typoBoxEm(shaper, fontId);
    rubyAscentEm = Math.max(rubyAscentEm, box.ascentEm);
    rubyDescentEm = Math.max(rubyDescentEm, box.descentEm);
    sawRuby = true;
  }

  if (!sawBase && !sawRuby) return null;
  return {
    baseAscentEm: sawBase ? baseAscentEm : rubyAscentEm,
    rubyAscentEm: sawRuby ? rubyAscentEm : baseAscentEm,
    rubyDescentEm: sawRuby ? rubyDescentEm : 0,
  };
}

/**
 * Detects ruby that actually collides with the base text, and reports it **once
 * per ruby font**.
 *
 * Comparing measured ink against the declared `sTypo` box directly would be far
 * too noisy to be useful: real fonts routinely draw past it (Mona Sans Regular
 * declares -0.167 em but `Ç` reaches -0.224; Source Han declares -0.120 but its
 * Latin `g` reaches -0.257). None of that matters on its own, because the base
 * text almost never fills its own box either.
 *
 * What matters is whether the two inks meet. The layout puts the ruby's
 * reserved descender line exactly `rubyGap` above the base's `sTypo` top, so
 * the surviving clearance for one annotation is
 *
 * ```text
 *   (baseTypoTop - baseInkTop) + rubyGap + (rubyReservedDescent - rubyInkDescent)
 * ```
 *
 * and only a negative result is a real defect - fixable by raising `rubyGap`.
 */
export function collectRubyClearanceLoss(
  annotations: Iterable<{
    rubyFontIds: Iterable<FontId>;
    /** Base ink height above the base baseline, in layout units. */
    baseInkTop: number;
    /** Ruby ink depth below the ruby baseline, in layout units. */
    rubyInkDescent: number;
  }>,
  anchors: {
    /** `baseAscentEm * fontSize`: where the layout assumed base ink stops. */
    baseTypoTop: number;
    /** `rubyDescentEm * rubyFontSize`: the descent the row reserved. */
    rubyReservedDescent: number;
    rubyGap: number;
  },
  tolerance = 0,
): RubyClearanceLoss[] {
  const worst = new Map<FontId, RubyClearanceLoss>();
  for (const { rubyFontIds, baseInkTop, rubyInkDescent } of annotations) {
    const clearance =
      anchors.baseTypoTop -
      baseInkTop +
      anchors.rubyGap +
      (anchors.rubyReservedDescent - rubyInkDescent);
    if (!(clearance < -tolerance)) continue;
    const overlap = -clearance;
    for (const fontId of rubyFontIds) {
      const previous = worst.get(fontId);
      if (previous && previous.overlap >= overlap) continue;
      worst.set(fontId, { fontId, overlap });
    }
  }
  return [...worst.values()].sort((a, b) => a.fontId - b.fontId);
}
