/**
 * JLReq (Requirements for Japanese Text Layout, W3C) character-class support
 * for ruby (furigana) *overhang* budgets.
 *
 * When a ruby annotation is wider than the base characters it annotates, the
 * surplus ruby width may hang out over the characters immediately to the left
 * and right of the base run. How far it may hang depends on the *character
 * class* (per JLReq Appendix A, "Character Classes",
 * https://www.w3.org/TR/jlreq/#character_classes) of that adjacent character:
 * ruby may hang generously over ordinary kana, but only up to a bracket / full
 * stop / comma glyph and never over a following ideograph.
 *
 * This module classifies a single code point into the subset of JLReq classes
 * that actually influence overhang, and exposes the JLReq-recommended default
 * overhang budgets. It is deliberately a *pure*, dependency-free lookup: the
 * layout code calls {@link jlreqCharClassAt} for the code point just before the
 * base run's start and just after its end, then consults
 * {@link DEFAULT_RUBY_OVERHANG} / {@link isOverhangGlyphLimited} to resolve how
 * much overhang to grant.
 *
 * The class ids in the union below map to JLReq's `cl-NN` ids (noted per
 * member). Only the classes relevant to overhang are modelled; every other
 * code point collapses to `"other"` (which is treated as a zero budget).
 *
 * Precedence: several narrow classes live *inside* the broad kana/CJK blocks
 * (small kana, the prolonged sound mark, and the katakana middle dot all sit in
 * U+30xx; brackets / stops / commas sit in U+30xx symbol areas). The narrow,
 * specific sets are therefore always tested BEFORE the broad ranges so the
 * specific class wins — see {@link jlreqCharClass} for the exact order.
 */

/** JLReq character classes that affect ruby overhang (see file header). */
export type JlreqCharClass =
  | "openingBracket" // cl-01
  | "closingBracket" // cl-02
  | "middleDot" // cl-05
  | "fullStop" // cl-06
  | "comma" // cl-07
  | "inseparable" // cl-08
  | "prolongedSoundMark" // cl-10
  | "smallKana" // cl-11
  | "hiragana" // cl-15
  | "katakana" // cl-16
  | "ideographic" // cl-19
  | "western" // cl-27
  | "other";

/**
 * cl-01 opening brackets. Includes the CJK/fullwidth opening members of
 * U+3008–U+3011 and the white-bracket pairs (U+3014/3016/3018/301A), the
 * fullwidth parentheses/brackets/braces, the reversed double-prime opener, the
 * single/double curly opening quotes, and the guillemet opener. The fullwidth
 * less-than sign U+FF1C is included as an opening angle bracket: lyrics in this
 * codebase use `＜…＞` as bracket pairs and ruby must not overhang past them
 * (a deliberate, documented extension of the strict JLReq set).
 */
const OPENING_BRACKETS: ReadonlySet<number> = new Set([
  0x2018, // ‘ LEFT SINGLE QUOTATION MARK
  0x201c, // “ LEFT DOUBLE QUOTATION MARK
  0x00ab, // « LEFT-POINTING DOUBLE ANGLE QUOTATION MARK
  0x3008, // 〈 LEFT ANGLE BRACKET
  0x300a, // 《 LEFT DOUBLE ANGLE BRACKET
  0x300c, // 「 LEFT CORNER BRACKET
  0x300e, // 『 LEFT WHITE CORNER BRACKET
  0x3010, // 【 LEFT BLACK LENTICULAR BRACKET
  0x3014, // 〔 LEFT TORTOISE SHELL BRACKET
  0x3016, // 〖 LEFT WHITE LENTICULAR BRACKET
  0x3018, // 〘 LEFT WHITE TORTOISE SHELL BRACKET
  0x301a, // 〚 LEFT WHITE SQUARE BRACKET
  0x301d, // 〝 REVERSED DOUBLE PRIME QUOTATION MARK
  0xff08, // （ FULLWIDTH LEFT PARENTHESIS
  0xff1c, // ＜ FULLWIDTH LESS-THAN SIGN (used as angle bracket)
  0xff3b, // ［ FULLWIDTH LEFT SQUARE BRACKET
  0xff5b, // ｛ FULLWIDTH LEFT CURLY BRACKET
  0xff5f, // ｟ FULLWIDTH LEFT WHITE PARENTHESIS
]);

/**
 * cl-02 closing brackets, the matching closers of {@link OPENING_BRACKETS}.
 * NOTE: U+2019 (’) is intentionally *not* here — this codebase uses it as a
 * typographic apostrophe inside romanizations (e.g. `Khot’`), so it is
 * classified as {@link JlreqCharClass} `"western"` instead. The fullwidth
 * greater-than sign U+FF1E is the closing counterpart of U+FF1C above.
 */
const CLOSING_BRACKETS: ReadonlySet<number> = new Set([
  0x201d, // ” RIGHT DOUBLE QUOTATION MARK
  0x00bb, // » RIGHT-POINTING DOUBLE ANGLE QUOTATION MARK
  0x3009, // 〉 RIGHT ANGLE BRACKET
  0x300b, // 》 RIGHT DOUBLE ANGLE BRACKET
  0x300d, // 」 RIGHT CORNER BRACKET
  0x300f, // 』 RIGHT WHITE CORNER BRACKET
  0x3011, // 】 RIGHT BLACK LENTICULAR BRACKET
  0x3015, // 〕 RIGHT TORTOISE SHELL BRACKET
  0x3017, // 〗 RIGHT WHITE LENTICULAR BRACKET
  0x3019, // 〙 RIGHT WHITE TORTOISE SHELL BRACKET
  0x301b, // 〛 RIGHT WHITE SQUARE BRACKET
  0x301f, // 〟 DOUBLE PRIME QUOTATION MARK
  0xff09, // ） FULLWIDTH RIGHT PARENTHESIS
  0xff1e, // ＞ FULLWIDTH GREATER-THAN SIGN (used as angle bracket)
  0xff3d, // ］ FULLWIDTH RIGHT SQUARE BRACKET
  0xff5d, // ｝ FULLWIDTH RIGHT CURLY BRACKET
  0xff60, // ｠ FULLWIDTH RIGHT WHITE PARENTHESIS
]);

/**
 * cl-05 middle dots. Only the fullwidth colon/semicolon, the katakana middle
 * dot and the Latin-1 middle dot qualify; the ASCII `:` / `;` are `"western"`.
 */
const MIDDLE_DOTS: ReadonlySet<number> = new Set([
  0x30fb, // ・ KATAKANA MIDDLE DOT
  0x00b7, // · MIDDLE DOT
  0xff1a, // ： FULLWIDTH COLON
  0xff1b, // ； FULLWIDTH SEMICOLON
]);

/** cl-06 full stops (ideographic / fullwidth / halfwidth period). */
const FULL_STOPS: ReadonlySet<number> = new Set([
  0x3002, // 。 IDEOGRAPHIC FULL STOP
  0xff0e, // ． FULLWIDTH FULL STOP
  0xff61, // ｡ HALFWIDTH IDEOGRAPHIC FULL STOP
]);

/** cl-07 commas (ideographic / fullwidth / halfwidth comma). */
const COMMAS: ReadonlySet<number> = new Set([
  0x3001, // 、 IDEOGRAPHIC COMMA
  0xff0c, // ， FULLWIDTH COMMA
  0xff64, // ､ HALFWIDTH IDEOGRAPHIC COMMA
]);

/**
 * cl-08 inseparable characters — leaders / dashes / repetition marks that must
 * not be split. Covers the em/horizontal-bar dashes, the two- and three-dot
 * leaders, and the vertical kana repetition marks U+3033–U+3035.
 */
const INSEPARABLE: ReadonlySet<number> = new Set([
  0x2014, // — EM DASH
  0x2015, // ― HORIZONTAL BAR
  0x2025, // ‥ TWO DOT LEADER
  0x2026, // … HORIZONTAL ELLIPSIS
  0x3033, // 〳 VERTICAL KANA REPEAT MARK UPPER HALF
  0x3034, // 〴 VERTICAL KANA REPEAT WITH VOICED SOUND MARK UPPER HALF
  0x3035, // 〵 VERTICAL KANA REPEAT MARK LOWER HALF
]);

/**
 * cl-11 small (sutegana) kana — the small hiragana and katakana plus the
 * katakana phonetic extensions U+31F0–U+31FF. Small kana form a distinct class
 * and therefore win over the broad hiragana/katakana ranges.
 */
const SMALL_KANA: ReadonlySet<number> = new Set([
  // Small hiragana
  0x3041, 0x3043, 0x3045, 0x3047, 0x3049, 0x3063, 0x3083, 0x3085, 0x3087,
  0x308e, 0x3095, 0x3096,
  // Small katakana
  0x30a1, 0x30a3, 0x30a5, 0x30a7, 0x30a9, 0x30c3, 0x30e3, 0x30e5, 0x30e7,
  0x30ee, 0x30f5, 0x30f6,
]);

/** cl-10 prolonged sound marks (fullwidth + halfwidth chōonpu). */
const PROLONGED_SOUND_MARKS: ReadonlySet<number> = new Set([
  0x30fc, // ー KATAKANA-HIRAGANA PROLONGED SOUND MARK
  0xff70, // ｰ HALFWIDTH KATAKANA-HIRAGANA PROLONGED SOUND MARK
]);

/** Sorted inclusive `[lo, hi]` ranges, searched with {@link inSortedRanges}. */
type CodePointRange = readonly [number, number];

/** cl-19 ideographic. Han only — Hangul syllables/Jamo are explicitly excluded. */
const IDEOGRAPHIC_RANGES: readonly CodePointRange[] = [
  [0x3005, 0x3005], // 々 IDEOGRAPHIC ITERATION MARK
  [0x3007, 0x3007], // 〇 IDEOGRAPHIC NUMBER ZERO
  [0x3400, 0x4dbf], // CJK Unified Ideographs Extension A
  [0x4e00, 0x9fff], // CJK Unified Ideographs
  [0xf900, 0xfaff], // CJK Compatibility Ideographs
  [0x20000, 0x2fa1f], // Supplementary-plane extensions (B–F + compat supplement)
];

/**
 * cl-27 western. Latin/Greek/Cyrillic letters, digits and ASCII punctuation.
 * The ASCII space U+0020 is included: it is western-run whitespace and behaves
 * like a western glyph for overhang. Fullwidth Latin letters and digits
 * (U+FF10–U+FF19, U+FF21–U+FF3A, U+FF41–U+FF5A) are treated as western (they
 * are romaji/latin content). The typographic apostrophe U+2019 is western too
 * (see {@link CLOSING_BRACKETS}).
 */
const WESTERN_RANGES: readonly CodePointRange[] = [
  [0x0020, 0x007e], // ASCII space + printable Basic Latin
  [0x00c0, 0x00d6], // Latin-1 uppercase letters
  [0x00d8, 0x00f6], // Latin-1 letters (Ø–ö)
  [0x00f8, 0x00ff], // Latin-1 lowercase letters
  [0x0100, 0x024f], // Latin Extended-A + Extended-B
  [0x0370, 0x03ff], // Greek and Coptic
  [0x0400, 0x04ff], // Cyrillic
  [0x2019, 0x2019], // ’ RIGHT SINGLE QUOTATION MARK (typographic apostrophe)
  [0xff10, 0xff19], // Fullwidth digits
  [0xff21, 0xff3a], // Fullwidth uppercase Latin
  [0xff41, 0xff5a], // Fullwidth lowercase Latin
];

/** Binary search: true when `codePoint` falls in one of the sorted ranges. */
function inSortedRanges(
  codePoint: number,
  ranges: readonly CodePointRange[],
): boolean {
  let low = 0;
  let high = ranges.length - 1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    const [start, end] = ranges[mid]!;
    if (codePoint < start) high = mid - 1;
    else if (codePoint > end) low = mid + 1;
    else return true;
  }
  return false;
}

/**
 * Classifies a single Unicode code point into its JLReq character class.
 *
 * The narrow, specific sets (small kana, prolonged sound mark, middle dot,
 * brackets, full stop, comma, inseparable) are tested BEFORE the broad
 * hiragana/katakana/ideographic/western ranges, because several of them live
 * inside those ranges and must take precedence (e.g. `っ` is `smallKana`, not
 * `hiragana`; `ー` is `prolongedSoundMark`, not `katakana`; `・` is `middleDot`,
 * not `katakana`).
 */
export function jlreqCharClass(codePoint: number): JlreqCharClass {
  // 1. Narrow, specific sets first (they overlap the broad ranges below).
  if (SMALL_KANA.has(codePoint)) return "smallKana";
  if (PROLONGED_SOUND_MARKS.has(codePoint)) return "prolongedSoundMark";
  if (MIDDLE_DOTS.has(codePoint)) return "middleDot";
  if (OPENING_BRACKETS.has(codePoint)) return "openingBracket";
  if (CLOSING_BRACKETS.has(codePoint)) return "closingBracket";
  if (FULL_STOPS.has(codePoint)) return "fullStop";
  if (COMMAS.has(codePoint)) return "comma";
  if (INSEPARABLE.has(codePoint)) return "inseparable";

  // 2. Broad script ranges. Small kana / marks above already peeled off.
  if (codePoint >= 0x3041 && codePoint <= 0x309f) {
    // U+309B/U+309C (voiced/semi-voiced sound marks) are left as `other`.
    if (codePoint !== 0x309b && codePoint !== 0x309c) return "hiragana";
    return "other";
  }
  if (codePoint >= 0x30a0 && codePoint <= 0x30ff) return "katakana";
  if (inSortedRanges(codePoint, IDEOGRAPHIC_RANGES)) return "ideographic";
  if (inSortedRanges(codePoint, WESTERN_RANGES)) return "western";

  return "other";
}

/**
 * Classifies the character at (or immediately before) a UTF-16 offset in a
 * string, handling surrogate pairs. Returns `null` when the offset is outside
 * the string (i.e. there is no adjacent character — a line edge).
 *
 * Callers pass `leftIndex - 1` to inspect the neighbour before a base run and
 * `rightIndex` to inspect the neighbour after it. When `utf16Index` lands on
 * the low surrogate of a pair, the class of the whole supplementary-plane code
 * point (which starts one unit earlier) is returned, so both UTF-16 offsets of
 * a surrogate pair classify identically.
 */
export function jlreqCharClassAt(
  text: string,
  utf16Index: number,
): JlreqCharClass | null {
  if (utf16Index < 0 || utf16Index >= text.length) return null;

  const unit = text.charCodeAt(utf16Index);
  const isLowSurrogate = unit >= 0xdc00 && unit <= 0xdfff;
  const highBefore =
    utf16Index > 0 &&
    text.charCodeAt(utf16Index - 1) >= 0xd800 &&
    text.charCodeAt(utf16Index - 1) <= 0xdbff;
  const base = isLowSurrogate && highBefore ? utf16Index - 1 : utf16Index;

  return jlreqCharClass(text.codePointAt(base)!);
}

/**
 * Default JLReq-recommended maximum ruby overhang per adjacent character class,
 * in ruby em. `ideographic`, `western` and `other` deny overhang (0); the kana
 * and stop/bracket classes permit a full ruby em, subject to
 * {@link isOverhangGlyphLimited} for the glyph-bounded classes.
 */
export const DEFAULT_RUBY_OVERHANG: Readonly<Record<JlreqCharClass, number>> =
  Object.freeze({
    openingBracket: 1.0,
    closingBracket: 1.0,
    middleDot: 1.0,
    fullStop: 1.0,
    comma: 1.0,
    inseparable: 1.0,
    prolongedSoundMark: 1.0,
    smallKana: 1.0,
    hiragana: 1.0,
    katakana: 1.0,
    ideographic: 0,
    western: 0,
    other: 0,
  });

/**
 * True when the class denotes a glyph the ruby must not overhang *past*
 * (brackets, full stops, commas) — the ruby may extend over at most that one
 * glyph's own advance.
 */
export function isOverhangGlyphLimited(charClass: JlreqCharClass): boolean {
  return (
    charClass === "openingBracket" ||
    charClass === "closingBracket" ||
    charClass === "fullStop" ||
    charClass === "comma"
  );
}
