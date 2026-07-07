/**
 * Normalization and alignment utilities for the name language classifier.
 *
 * Core principle: ALIGN, don't blind-strip. Segment the romanization and
 * align each segment to the original's components. Keep CJK-corresponding
 * segments as scoring evidence; set aside only pass-through latin identical
 * in both sides.
 */

/** NFKC-normalize the string (fullwidth → halfwidth, etc.) */
export function nfkcNormalize(s: string): string {
  return s.normalize("NFKC");
}

/**
 * Canonical phonetic skeleton: collapse Hepburn/nihon-shiki/wapuro variants
 * into a single representation for lenient comparison.
 *
 * - Long vowels: ou→o, uu→u, ei→e (optional, configurable)
 * - shi/si → si, tsu/tu → tu, fu/hu → hu, chi/ti → ti, ji/zi → zi
 * - Drop apostrophes, hyphens, spaces
 * - Lowercase
 */
export function phoneticSkeleton(s: string): string {
  let r = s.toLowerCase();
  // Drop apostrophes, hyphens, spaces
  r = r.replace(/['\-\s]/g, "");
  // Unify romanization variants (order matters)
  r = r.replace(/sha/g, "sya");
  r = r.replace(/shi/g, "si");
  r = r.replace(/shu/g, "syu");
  r = r.replace(/sho/g, "syo");
  r = r.replace(/chi/g, "ti");
  r = r.replace(/cha/g, "tya");
  r = r.replace(/chu/g, "tyu");
  r = r.replace(/cho/g, "tyo");
  r = r.replace(/tchi/g, "tti");
  r = r.replace(/cchi/g, "tti");
  r = r.replace(/tsu/g, "tu");
  r = r.replace(/fu/g, "hu");
  r = r.replace(/ji/g, "zi");
  r = r.replace(/ja/g, "zya");
  r = r.replace(/ju/g, "zyu");
  r = r.replace(/jo/g, "zyo");
  // Long vowels (collapse)
  r = r.replace(/ou/g, "o");
  r = r.replace(/oo/g, "o");
  r = r.replace(/uu/g, "u");
  return r;
}

/**
 * Represents a segment from the romanization aligned to the original.
 */
export interface AlignedSegment {
  /** The romanization text for this segment */
  roman: string;
  /** The original text this segment corresponds to */
  original: string;
  /** Whether this segment contains CJK (Han) characters → use as scoring evidence */
  isCJK: boolean;
  /** Whether this is pass-through latin identical in both sides (not scoring evidence) */
  isPassthrough: boolean;
  /** Whether this is a meta-annotation (Unknown, English DNN, etc.) — ignore */
  isMetaAnnotation: boolean;
}

const HAN_REGEX = /\p{Script=Han}/u;
const LATIN_REGEX = /^[\p{Script=Latin}\p{N}\p{P}\p{S}\s]+$/u;
const META_ANNOTATIONS =
  /^\s*\((unknown|english\s+dnn|japanese|chinese|korean)\)\s*$/i;

/**
 * Check if a character is a CJK/Han character
 */
function isHanChar(ch: string): boolean {
  return HAN_REGEX.test(ch);
}

/**
 * Split a string into tokens: contiguous Han, contiguous Latin/punctuation, etc.
 */
function tokenize(s: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let currentIsHan: boolean | null = null;

  for (const ch of s) {
    const han = isHanChar(ch);
    if (currentIsHan !== null && han !== currentIsHan) {
      if (current.trim()) tokens.push(current);
      current = "";
    }
    current += ch;
    currentIsHan = han;
  }
  if (current.trim()) tokens.push(current);
  return tokens;
}

/**
 * Split romanization by common delimiters (spaces, @, parenthetical boundaries)
 * while preserving the delimiters' semantic role.
 */
function splitRomanization(roman: string): string[] {
  // Split on spaces, but keep @-delimited and parenthetical parts together
  const parts: string[] = [];
  // Split by @ first, then by spaces within each part
  const atParts = roman.split("@");
  for (let i = 0; i < atParts.length; i++) {
    const subparts = atParts[i].split(/\s+/).filter(Boolean);
    if (i > 0 && subparts.length > 0) {
      // Prefix with @ to indicate it was an @-segment
      subparts[0] = "@" + subparts[0];
    }
    parts.push(...subparts);
  }
  return parts;
}

/**
 * Align romanization segments to the original text.
 *
 * Strategy: tokenize the original into Han / non-Han runs, split the
 * romanization into parts, and match them positionally. For simple cases
 * (one Han block, one romanization), this is trivial. For complex cases
 * (cosMo@暴走P), we align by comparing pass-through latin tokens.
 */
export function alignSegments(
  romanization: string,
  original: string,
): AlignedSegment[] {
  const normRoman = nfkcNormalize(romanization);
  const normOriginal = nfkcNormalize(original);

  // Check for meta-annotation patterns in romanization
  if (META_ANNOTATIONS.test(normRoman)) {
    return [
      {
        roman: normRoman,
        original: normOriginal,
        isCJK: false,
        isPassthrough: false,
        isMetaAnnotation: true,
      },
    ];
  }

  const origTokens = tokenize(normOriginal);
  const segments: AlignedSegment[] = [];

  // Simple case: original is all Han (most common case for this classifier)
  const allHan = origTokens.every((t) => HAN_REGEX.test(t));
  if (allHan && origTokens.length === 1) {
    // Check if romanization has meta-annotation suffixes like "(Unknown)"
    const metaMatch = normRoman.match(
      /^(.+?)\s*\((unknown|english\s+dnn|japanese|chinese|korean)\)\s*$/i,
    );
    if (metaMatch) {
      segments.push({
        roman: metaMatch[1].trim(),
        original: normOriginal,
        isCJK: true,
        isPassthrough: false,
        isMetaAnnotation: false,
      });
      segments.push({
        roman: `(${metaMatch[2]})`,
        original: "",
        isCJK: false,
        isPassthrough: false,
        isMetaAnnotation: true,
      });
    } else {
      segments.push({
        roman: normRoman,
        original: normOriginal,
        isCJK: true,
        isPassthrough: false,
        isMetaAnnotation: false,
      });
    }
    return segments;
  }

  // Complex case: mixed Han + Latin in original (e.g., "cosMo@暴走P", "TEN丸")
  // Strategy: find pass-through latin tokens in original and match them in romanization
  const romanLower = normRoman.toLowerCase();

  for (const origToken of origTokens) {
    if (HAN_REGEX.test(origToken)) {
      // Han token — find the corresponding romanization part
      // For now, mark as CJK; the remaining non-passthrough roman is the evidence
      segments.push({
        roman: "", // will be filled below
        original: origToken,
        isCJK: true,
        isPassthrough: false,
        isMetaAnnotation: false,
      });
    } else if (LATIN_REGEX.test(origToken)) {
      // Latin token in original — check if it appears identically in romanization
      const origLower = origToken.toLowerCase().trim();
      if (origLower && romanLower.includes(origLower)) {
        segments.push({
          roman: origToken,
          original: origToken,
          isCJK: false,
          isPassthrough: true,
          isMetaAnnotation: false,
        });
      }
    }
  }

  // Now assign remaining romanization to CJK segments
  let remainingRoman = normRoman;
  // Remove passthrough segments from romanization
  for (const seg of segments) {
    if (seg.isPassthrough && seg.roman) {
      // Remove the passthrough part (case-insensitive)
      const idx = remainingRoman.toLowerCase().indexOf(seg.roman.toLowerCase());
      if (idx !== -1) {
        remainingRoman =
          remainingRoman.slice(0, idx) +
          remainingRoman.slice(idx + seg.roman.length);
      }
    }
  }

  // Clean up remaining roman: remove @ and trim
  remainingRoman = remainingRoman.replace(/@/g, "").trim();

  // Assign to CJK segments (distribute evenly if multiple, or all to single)
  const cjkSegments = segments.filter((s) => s.isCJK);
  if (cjkSegments.length === 1) {
    cjkSegments[0].roman = remainingRoman;
  } else if (cjkSegments.length > 1 && remainingRoman) {
    // Best effort: assign all remaining to the largest Han segment
    // (more sophisticated alignment would require dictionary lookup)
    const largest = cjkSegments.reduce((a, b) =>
      a.original.length >= b.original.length ? a : b,
    );
    largest.roman = remainingRoman;
  }

  return segments;
}

/**
 * Extract the CJK scoring evidence from aligned segments.
 * Returns the romanization parts that correspond to Han text (the "core" to score).
 */
export function extractScoringCore(segments: AlignedSegment[]): {
  romanCore: string;
  hanCore: string;
} {
  const cjkSegs = segments.filter((s) => s.isCJK && !s.isMetaAnnotation);
  return {
    romanCore: cjkSegs.map((s) => s.roman).join(" "),
    hanCore: cjkSegs.map((s) => s.original).join(""),
  };
}
