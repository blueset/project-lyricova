type SyllableGroup = readonly [initial: string, finals: readonly string[]];

export interface DiscriminativeFeatureScores {
  pinyinScore: number;
  romajiScore: number;
}

export interface PhonotacticClassification {
  label: "ja" | "zh" | "unknown";
  confidence: number;
  pinyinCoverage: number;
  romajiCoverage: number;
  pinyinFeatures: number;
  romajiFeatures: number;
}

const STRIP_MATCHING_SEPARATORS = /[\s'’\-]+/g;
const ROMAJI_VOWEL_REGEX = /[aeiou]/;
const GEMINATE_CONSONANT_REGEX = /(?:kk|pp|tt|ss|cc|gg|dd|bb|mm|rr|zz)/;
const LONG_VOWEL_REGEX = /[āēīōūâêîôû]|ou|uu|ei|oo/;

const PINYIN_GROUPS: readonly SyllableGroup[] = [
  ["", ["a", "ai", "an", "ang", "ao", "e", "ei", "en", "eng", "er", "o", "ou"]],
  ["b", ["a", "ai", "an", "ang", "ao", "ei", "en", "eng", "i", "ian", "iao", "ie", "in", "ing", "o", "u"]],
  ["p", ["a", "ai", "an", "ang", "ao", "ei", "en", "eng", "i", "ian", "iao", "ie", "in", "ing", "o", "ou", "u"]],
  ["m", ["a", "ai", "an", "ang", "ao", "e", "ei", "en", "eng", "i", "ian", "iao", "ie", "in", "ing", "iu", "o", "ou", "u"]],
  ["f", ["a", "an", "ang", "ei", "en", "eng", "o", "ou", "u"]],
  ["d", ["a", "ai", "an", "ang", "ao", "e", "ei", "en", "eng", "i", "ian", "iao", "ie", "ing", "iu", "ong", "ou", "u", "uan", "ui", "un", "uo"]],
  ["t", ["a", "ai", "an", "ang", "ao", "e", "eng", "i", "ian", "iao", "ie", "ing", "ong", "ou", "u", "uan", "ui", "un", "uo"]],
  ["n", ["a", "ai", "an", "ang", "ao", "e", "ei", "en", "eng", "i", "ian", "iang", "iao", "ie", "in", "ing", "iu", "ong", "ou", "u", "uan", "ue", "un", "uo", "v", "ve"]],
  ["l", ["a", "ai", "an", "ang", "ao", "e", "ei", "eng", "i", "ia", "ian", "iang", "iao", "ie", "in", "ing", "iu", "ong", "ou", "u", "uan", "un", "uo", "v", "ve"]],
  ["g", ["a", "ai", "an", "ang", "ao", "e", "ei", "en", "eng", "ong", "ou", "u", "ua", "uai", "uan", "uang", "ui", "un", "uo"]],
  ["k", ["a", "ai", "an", "ang", "ao", "e", "en", "eng", "ong", "ou", "u", "ua", "uai", "uan", "uang", "ui", "un", "uo"]],
  ["h", ["a", "ai", "an", "ang", "ao", "e", "ei", "en", "eng", "ong", "ou", "u", "ua", "uai", "uan", "uang", "ui", "un", "uo"]],
  ["j", ["i", "ia", "ian", "iang", "iao", "ie", "in", "ing", "iong", "iu", "u", "uan", "ue", "un"]],
  ["q", ["i", "ia", "ian", "iang", "iao", "ie", "in", "ing", "iong", "iu", "u", "uan", "ue", "un"]],
  ["x", ["i", "ia", "ian", "iang", "iao", "ie", "in", "ing", "iong", "iu", "u", "uan", "ue", "un"]],
  ["zh", ["a", "ai", "an", "ang", "ao", "e", "ei", "en", "eng", "i", "ong", "ou", "u", "ua", "uai", "uan", "uang", "ui", "un", "uo"]],
  ["ch", ["a", "ai", "an", "ang", "ao", "e", "en", "eng", "i", "ong", "ou", "u", "ua", "uai", "uan", "uang", "ui", "un", "uo"]],
  ["sh", ["a", "ai", "an", "ang", "ao", "e", "ei", "en", "eng", "i", "ou", "u", "ua", "uai", "uan", "uang", "ui", "un", "uo"]],
  ["r", ["an", "ang", "ao", "e", "en", "eng", "i", "ong", "ou", "u", "ua", "uan", "ui", "un", "uo"]],
  ["z", ["a", "ai", "an", "ang", "ao", "e", "ei", "en", "eng", "i", "ong", "ou", "u", "uan", "ui", "un", "uo"]],
  ["c", ["a", "ai", "an", "ang", "ao", "e", "en", "eng", "i", "ong", "ou", "u", "uan", "ui", "un", "uo"]],
  ["s", ["a", "ai", "an", "ang", "ao", "e", "en", "eng", "i", "ong", "ou", "u", "uan", "ui", "un", "uo"]],
  ["y", ["a", "an", "ang", "ao", "e", "i", "in", "ing", "o", "ong", "ou", "u", "uan", "ue", "un"]],
  ["w", ["a", "ai", "an", "ang", "ei", "en", "eng", "o", "u"]],
];

const ROMAJI_MORAE = new Set<string>([
  "a",
  "i",
  "u",
  "e",
  "o",
  "ka",
  "ki",
  "ku",
  "ke",
  "ko",
  "ga",
  "gi",
  "gu",
  "ge",
  "go",
  "sa",
  "shi",
  "si",
  "su",
  "se",
  "so",
  "za",
  "ji",
  "zi",
  "zu",
  "ze",
  "zo",
  "ja",
  "ju",
  "jo",
  "ta",
  "chi",
  "ti",
  "tsu",
  "tu",
  "te",
  "to",
  "da",
  "de",
  "do",
  "di",
  "du",
  "na",
  "ni",
  "nu",
  "ne",
  "no",
  "ha",
  "hi",
  "fu",
  "hu",
  "he",
  "ho",
  "fa",
  "fi",
  "fe",
  "fo",
  "ba",
  "bi",
  "bu",
  "be",
  "bo",
  "pa",
  "pi",
  "pu",
  "pe",
  "po",
  "ma",
  "mi",
  "mu",
  "me",
  "mo",
  "ya",
  "yu",
  "yo",
  "ra",
  "ri",
  "ru",
  "re",
  "ro",
  "wa",
  "wo",
  "we",
  "wi",
  "vu",
  "kya",
  "kyu",
  "kyo",
  "gya",
  "gyu",
  "gyo",
  "sha",
  "shu",
  "sho",
  "sya",
  "syu",
  "syo",
  "ja",
  "ju",
  "jo",
  "zya",
  "zyu",
  "zyo",
  "cha",
  "chu",
  "cho",
  "tya",
  "tyu",
  "tyo",
  "cya",
  "cyu",
  "cyo",
  "nya",
  "nyu",
  "nyo",
  "hya",
  "hyu",
  "hyo",
  "bya",
  "byu",
  "byo",
  "pya",
  "pyu",
  "pyo",
  "mya",
  "myu",
  "myo",
  "rya",
  "ryu",
  "ryo",
  "she",
  "je",
  "che",
]);

const PINYIN_SYLLABLES = buildPrefixedSet(PINYIN_GROUPS);
const PINYIN_TOKEN_LENGTHS = getTokenLengths(PINYIN_SYLLABLES);
const ROMAJI_TOKEN_LENGTHS = getTokenLengths(ROMAJI_MORAE);

function buildPrefixedSet(groups: readonly SyllableGroup[]): Set<string> {
  const syllables: string[] = [];

  for (const [initial, finals] of groups) {
    for (const final of finals) {
      syllables.push(`${initial}${final}`);
    }
  }

  return new Set(syllables);
}

function getTokenLengths(tokens: ReadonlySet<string>): number[] {
  return [...new Set(Array.from(tokens, (token) => token.length))].sort(
    (left, right) => right - left,
  );
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function normalizePinyinInput(romanization: string): string {
  return romanization
    .normalize("NFC")
    .normalize("NFKC")
    .toLowerCase()
    .replace(STRIP_MATCHING_SEPARATORS, "")
    .replace(/ü/g, "v")
    .replace(/[üǖǘǚǜ]/g, "v");
}

function normalizeRomajiInput(romanization: string): string {
  return romanization
    .normalize("NFC")
    .normalize("NFKC")
    .toLowerCase()
    .replace(STRIP_MATCHING_SEPARATORS, "")
    .replace(/[āâ]/g, "a")
    .replace(/[ēê]/g, "e")
    .replace(/[īî]/g, "i")
    .replace(/[ōô]/g, "o")
    .replace(/[ūû]/g, "u");
}

function normalizeFeatureInput(romanization: string): string {
  return romanization
    .normalize("NFC")
    .normalize("NFKC")
    .toLowerCase()
    .replace(STRIP_MATCHING_SEPARATORS, "");
}

function greedyCoverage(
  input: string,
  tokens: ReadonlySet<string>,
  lengths: readonly number[],
): number {
  if (!input) {
    return 0;
  }

  let matched = 0;
  let index = 0;

  while (index < input.length) {
    let matchedLength = 0;

    for (const length of lengths) {
      if (index + length > input.length) {
        continue;
      }

      if (tokens.has(input.slice(index, index + length))) {
        matchedLength = length;
        break;
      }
    }

    if (matchedLength > 0) {
      matched += matchedLength;
      index += matchedLength;
      continue;
    }

    index += 1;
  }

  return matched / input.length;
}

function canMatchRomajiMora(input: string, index: number): boolean {
  for (const length of ROMAJI_TOKEN_LENGTHS) {
    if (index + length > input.length) {
      continue;
    }

    if (ROMAJI_MORAE.has(input.slice(index, index + length))) {
      return true;
    }
  }

  return false;
}

function isStandaloneRomajiN(input: string, index: number): boolean {
  if (input[index] !== "n") {
    return false;
  }

  const nextChar = input[index + 1];
  if (!nextChar) {
    return true;
  }

  return !ROMAJI_VOWEL_REGEX.test(nextChar) && nextChar !== "y";
}

function isGeminateRomaji(input: string, index: number): boolean {
  const current = input[index];
  const next = input[index + 1];

  if (!current || !next) {
    return false;
  }

  if (
    current === "n" ||
    current === "y" ||
    current === "w" ||
    ROMAJI_VOWEL_REGEX.test(current)
  ) {
    return false;
  }

  if (current === next) {
    return canMatchRomajiMora(input, index + 1);
  }

  if (current === "c" && input.slice(index + 1, index + 3) === "ch") {
    return canMatchRomajiMora(input, index + 1);
  }

  return false;
}

export function scorePinyin(romanization: string): number {
  return greedyCoverage(
    normalizePinyinInput(romanization),
    PINYIN_SYLLABLES,
    PINYIN_TOKEN_LENGTHS,
  );
}

export function scoreRomaji(romanization: string): number {
  const input = normalizeRomajiInput(romanization);
  if (!input) {
    return 0;
  }

  let matched = 0;
  let index = 0;

  while (index < input.length) {
    if (isGeminateRomaji(input, index)) {
      matched += 1;
      index += 1;
      continue;
    }

    if (isStandaloneRomajiN(input, index)) {
      matched += 1;
      index += 1;
      continue;
    }

    let matchedLength = 0;

    for (const length of ROMAJI_TOKEN_LENGTHS) {
      if (index + length > input.length) {
        continue;
      }

      if (ROMAJI_MORAE.has(input.slice(index, index + length))) {
        matchedLength = length;
        break;
      }
    }

    if (matchedLength > 0) {
      matched += matchedLength;
      index += matchedLength;
      continue;
    }

    index += 1;
  }

  return matched / input.length;
}

export function scoreDiscriminativeFeatures(
  romanization: string,
): DiscriminativeFeatureScores {
  const raw = romanization.normalize("NFC").normalize("NFKC").toLowerCase();
  const normalized = normalizeFeatureInput(romanization);
  if (!normalized) {
    return { pinyinScore: 0, romajiScore: 0 };
  }

  let pinyinScore = 0;
  let romajiScore = 0;

  if (/x[aeiouvü]/.test(normalized)) {
    pinyinScore += 0.2;
  }
  if (/q[aeiouvü]/.test(normalized)) {
    pinyinScore += 0.2;
  }
  if (/(zh|ch|sh)/.test(normalized)) {
    pinyinScore += 0.2;
  }
  if (/(ang|eng|ong|iu|ui)/.test(normalized)) {
    pinyinScore += 0.2;
  }
  if (normalized === "er" || /(^|[\s'’\-])er($|[\s'’\-])/.test(raw)) {
    pinyinScore += 0.1;
  }
  if (/[üv]/.test(normalized)) {
    pinyinScore += 0.25;
  }

  if (GEMINATE_CONSONANT_REGEX.test(normalized) || /cch/.test(normalized)) {
    romajiScore += 0.2;
  }
  if (/tsu/.test(normalized)) {
    romajiScore += 0.18;
  }
  if (/shi/.test(normalized)) {
    romajiScore += 0.18;
  }
  if (/fu/.test(normalized)) {
    romajiScore += 0.14;
  }
  if (LONG_VOWEL_REGEX.test(normalized)) {
    romajiScore += 0.15;
  }
  if (/(ky|ny|ry|my|hy|gy|by|py|sy|ty|jy)/.test(normalized)) {
    romajiScore += 0.2;
  }

  return {
    pinyinScore: clamp01(pinyinScore),
    romajiScore: clamp01(romajiScore),
  };
}

export function phonotacticClassify(
  romanization: string,
): PhonotacticClassification {
  const pinyinCoverage = scorePinyin(romanization);
  const romajiCoverage = scoreRomaji(romanization);
  const features = scoreDiscriminativeFeatures(romanization);

  const zhSignal = pinyinCoverage * 0.72 + features.pinyinScore * 0.28;
  const jaSignal = romajiCoverage * 0.72 + features.romajiScore * 0.28;
  const strongestSignal = Math.max(zhSignal, jaSignal);
  const delta = Math.abs(zhSignal - jaSignal);

  if (strongestSignal < 0.45 || delta < 0.08) {
    return {
      label: "unknown",
      confidence: clamp01(
        strongestSignal < 0.45 ? 1 - strongestSignal : 0.45 + delta,
      ),
      pinyinCoverage,
      romajiCoverage,
      pinyinFeatures: features.pinyinScore,
      romajiFeatures: features.romajiScore,
    };
  }

  return {
    label: zhSignal > jaSignal ? "zh" : "ja",
    confidence: clamp01(0.45 + delta * 0.9 + strongestSignal * 0.25),
    pinyinCoverage,
    romajiCoverage,
    pinyinFeatures: features.pinyinScore,
    romajiFeatures: features.romajiScore,
  };
}
