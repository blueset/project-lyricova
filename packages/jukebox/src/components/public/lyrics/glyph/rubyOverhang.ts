import type { JlreqCharClass } from "./jlreqCharClass";
import {
  DEFAULT_RUBY_OVERHANG,
  isOverhangGlyphLimited,
  jlreqCharClass,
  jlreqCharClassAt,
} from "./jlreqCharClass";

/**
 * JLReq-derived ruby overhang budgets and run classification.
 *
 * Ruby that is wider than the base text it annotates is absorbed by two
 * mechanisms, applied in this order:
 *
 * 1. **Overhang** - the ruby extends past the base range onto the adjacent
 *    characters, but only as far as those characters' JLReq class permits
 *    (`DEFAULT_RUBY_OVERHANG`, in ruby em). Overhanging over a bracket, full
 *    stop or comma may not extend past that glyph itself.
 * 2. **Base expansion** - whatever overhang cannot absorb spreads the base
 *    characters apart (JLReq 3.3.6 fig. 127 / 3.3.7 fig. 130). This is
 *    pre-measured into paragraph layout via `ParagraphRequest.rangeAdvances`
 *    so wrapping is correct on the first pass in the common case. A line-edge
 *    annotation gets one bounded retry when ruby-aligned placement makes the
 *    composed line wider than the available box.
 *
 * Horizontal ruby remains centred over its base, so each half-overhang must fit
 * independently: spare room on one side cannot compensate for a tighter
 * opposite side. This keeps the base undisturbed when both neighbours grant
 * enough room, while making expansion dominant next to ideographic/western
 * characters whose budget is zero.
 */

/** Per-side maximum overhang for one annotation, in layout units. */
export interface RubyOverhangBudget {
  left: number;
  right: number;
}

/**
 * Resolves the effective overhang table by merging caller overrides over
 * {@link DEFAULT_RUBY_OVERHANG}. Non-finite or negative overrides are ignored
 * so a malformed option can never produce negative geometry.
 */
export function resolveOverhangTable(
  overrides?: Partial<Record<JlreqCharClass, number>>,
): Record<JlreqCharClass, number> {
  const table = { ...DEFAULT_RUBY_OVERHANG };
  if (!overrides) return table;
  for (const [key, value] of Object.entries(overrides)) {
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
      table[key as JlreqCharClass] = value;
    }
  }
  return table;
}

/**
 * Resolves how far a ruby run annotating `[utf16Start, utf16End)` of `text`
 * may overhang on each side, in layout units.
 *
 * The two sides are resolved **independently** against the actual adjacent
 * character. When there is no adjacent character at all - the annotation
 * touches the start or end of the paragraph - the budget is `Infinity`: JLReq
 * sets the line head and line end *ruby-aligned*, so the ruby is free to stick
 * out past the base and is only constrained later, by the line's content box.
 * The first pass therefore leaves the edge base undisturbed; `rubyLayout.ts`
 * reserves the full ruby advance on one retry only when that placement would
 * otherwise make the line overflow.
 *
 * This is the **pre-layout** approximation: it can only see source adjacency,
 * so it cannot know that a neighbour will wrap onto another line, nor how wide
 * that neighbour's glyph actually is. Both are refined post-layout by
 * `clampBudgetToNeighbours` in `rubyLayout.ts`, which documents the two
 * directions in which the answers can differ.
 */
export function resolveOverhangBudget(
  text: string,
  utf16Start: number,
  utf16End: number,
  rubyFontSize: number,
  table: Record<JlreqCharClass, number>,
): RubyOverhangBudget {
  return {
    left: sideBudget(text, utf16Start - 1, rubyFontSize, table),
    right: sideBudget(text, utf16End, rubyFontSize, table),
  };
}

function sideBudget(
  text: string,
  utf16Index: number,
  rubyFontSize: number,
  table: Record<JlreqCharClass, number>,
): number {
  const charClass = jlreqCharClassAt(text, utf16Index);
  if (charClass === null) return Infinity;
  return Math.max(0, table[charClass]) * rubyFontSize;
}

/**
 * Caps a resolved side budget at the adjacent cluster's own advance when its
 * class is glyph-limited (brackets, full stops, commas: JLReq allows the ruby
 * over the punctuation itself but not past it). Only callable once layout is
 * known, since it needs the neighbour's real advance.
 */
export function capBudgetToGlyph(
  budget: number,
  charClass: JlreqCharClass | null,
  adjacentAdvance: number | null,
): number {
  if (charClass === null || adjacentAdvance === null) return budget;
  if (!isOverhangGlyphLimited(charClass)) return budget;
  return Math.min(budget, Math.max(0, adjacentAdvance));
}

/**
 * Character classes that behave as fixed-width Japanese text, i.e. runs that
 * JLReq allows to be letterspaced (inter-character spacing added between
 * them). Everything else - Latin, Cyrillic, Greek, Hangul, Thai, digits - is
 * proportional and must be **set solid**.
 */
const FIXED_WIDTH_CLASSES: ReadonlySet<JlreqCharClass> =
  new Set<JlreqCharClass>([
    "ideographic",
    "hiragana",
    "katakana",
    "prolongedSoundMark",
    "smallKana",
    "middleDot",
    "fullStop",
    "comma",
    "inseparable",
    "openingBracket",
    "closingBracket",
  ]);

/**
 * True when every non-whitespace character of `text` belongs to a fixed-width
 * Japanese class, i.e. the run may have inter-character spacing distributed
 * into it.
 *
 * Detection is by character class, never by font: the same font ships both
 * Latin and kana, and the real lyrics data freely mixes kana ruby over a
 * Latin/digit base (`Voc.`, `BAD`, `0`) with Latin romanization ruby over
 * Hangul, Cyrillic, Hanzi and Japanese bases. An empty or all-whitespace run
 * counts as proportional - there is nothing to letterspace.
 */
export function isFixedWidthRun(text: string): boolean {
  let sawFixed = false;
  for (const symbol of text) {
    if (isRunWhitespace(symbol)) continue;
    const codePoint = symbol.codePointAt(0);
    if (codePoint === undefined) continue;
    if (!FIXED_WIDTH_CLASSES.has(jlreqCharClass(codePoint))) return false;
    sawFixed = true;
  }
  return sawFixed;
}

/** Unicode `Zs` plus the ASCII/ideographic separators that appear in lyrics data. */
export function isRunWhitespace(symbol: string): boolean {
  return /^[\s\u3000\u00a0]+$/u.test(symbol);
}
