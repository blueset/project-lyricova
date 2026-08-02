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
 * `sTypoAscender`/`sTypoDescender` give the right box: for Source Han they are
 * exactly the ideographic em box (880 / -120 per 1000 upem), and for Latin
 * faces like Mona Sans they equal `hhea`, so those chains are unaffected.
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
export function resolveRubyVerticalMetrics(
  shaper: MetricsShaper,
  baseFontIds: Iterable<FontId>,
  rubyFontIds: Iterable<FontId>,
): RubyVerticalMetrics | null {
  let baseAscentEm = 0;
  let sawBase = false;
  for (const fontId of baseFontIds) {
    baseAscentEm = Math.max(baseAscentEm, typoBoxEm(shaper, fontId).ascentEm);
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
