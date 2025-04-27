/**
 * Convert katakana to hiragana.
 * @param str katakana
 */
export function kanaToHira(str: string): string {
  return (
    str &&
    str.replace(/[\u30a1-\u30f6]/g, (match) =>
      String.fromCharCode(match.charCodeAt(0) - 0x60)
    )
  );
}

// Romaji to hiragana
// @author marmooo https://github.com/marmooo/hiraroma
// @license MIT

type TreeNode = {
  [key: string]: string | TreeNode;
};

const tree: TreeNode = {
  "-": "ー",
  a: "あ",
  i: "い",
  u: "う",
  e: "え",
  o: "お",
  k: {
    a: "か",
    i: "き",
    u: "く",
    e: "け",
    o: "こ",
    y: {
      a: "きゃ",
      i: "きぃ",
      u: "きゅ",
      e: "きぇ",
      o: "きょ",
    },
    w: {
      a: "くぁ",
      i: "くぃ",
      u: "くぅ",
      e: "くぇ",
      o: "くぉ",
    },
  },
  s: {
    a: "さ",
    i: "し",
    u: "す",
    e: "せ",
    o: "そ",
    h: {
      a: "しゃ",
      i: "し",
      u: "しゅ",
      e: "しぇ",
      o: "しょ",
    },
    y: {
      a: "しゃ",
      i: "しぃ",
      u: "しゅ",
      e: "しぇ",
      o: "しょ",
    },
  },
  t: {
    a: "た",
    i: "ち",
    u: "つ",
    e: "て",
    o: "と",
    h: {
      a: "てゃ",
      i: "てぃ",
      u: "てゅ",
      e: "てぇ",
      o: "てょ",
    },
    y: {
      a: "ちゃ",
      i: "ちぃ",
      u: "ちゅ",
      e: "ちぇ",
      o: "ちょ",
    },
    s: {
      a: "つぁ",
      i: "つぃ",
      u: "つ",
      e: "つぇ",
      o: "つぉ",
    },
    w: {
      a: "とぁ",
      i: "とぃ",
      u: "とぅ",
      e: "とぇ",
      o: "とぉ",
    },
  },
  c: {
    a: "か",
    i: "し",
    u: "く",
    e: "せ",
    o: "こ",
    h: {
      a: "ちゃ",
      i: "ち",
      u: "ちゅ",
      e: "ちぇ",
      o: "ちょ",
    },
    y: {
      a: "ちゃ",
      i: "ちぃ",
      u: "ちゅ",
      e: "ちぇ",
      o: "ちょ",
    },
  },
  q: {
    a: "くぁ",
    i: "くぃ",
    u: "く",
    e: "くぇ",
    o: "くぉ",
  },
  n: {
    a: "な",
    i: "に",
    u: "ぬ",
    e: "ね",
    o: "の",
    n: "ん",
    y: {
      a: "にゃ",
      i: "にぃ",
      u: "にゅ",
      e: "にぇ",
      o: "にょ",
    },
  },
  h: {
    a: "は",
    i: "ひ",
    u: "ふ",
    e: "へ",
    o: "ほ",
    y: {
      a: "ひゃ",
      i: "ひぃ",
      u: "ひゅ",
      e: "ひぇ",
      o: "ひょ",
    },
    w: {
      a: "ふぁ",
      i: "ふぃ",
      e: "ふぇ",
      o: "ふぉ",
    },
  },
  f: {
    a: "ふぁ",
    i: "ふぃ",
    u: "ふ",
    e: "ふぇ",
    o: "ふぉ",
    y: {
      a: "ふゃ",
      u: "ふゅ",
      o: "ふょ",
    },
  },
  m: {
    a: "ま",
    i: "み",
    u: "む",
    e: "め",
    o: "も",
    y: {
      a: "みゃ",
      i: "みぃ",
      u: "みゅ",
      e: "みぇ",
      o: "みょ",
    },
  },
  y: {
    a: "や",
    u: "ゆ",
    e: "いぇ",
    o: "よ",
  },
  r: {
    a: "ら",
    i: "り",
    u: "る",
    e: "れ",
    o: "ろ",
    y: {
      a: "りゃ",
      i: "りぃ",
      u: "りゅ",
      e: "りぇ",
      o: "りょ",
    },
  },
  w: {
    a: "わ",
    i: "うぃ",
    u: "う",
    e: "うぇ",
    o: "を",
    h: {
      a: "うぁ",
      i: "うぃ",
      u: "う",
      e: "うぇ",
      o: "うぉ",
    },
    y: {
      i: "ゐ",
      e: "ゑ",
    },
  },
  g: {
    a: "が",
    i: "ぎ",
    u: "ぐ",
    e: "げ",
    o: "ご",
    y: {
      a: "ぎゃ",
      i: "ぎぃ",
      u: "ぎゅ",
      e: "ぎぇ",
      o: "ぎょ",
    },
    w: {
      a: "ぐぁ",
      i: "ぐぃ",
      u: "ぐぅ",
      e: "ぐぇ",
      o: "ぐぉ",
    },
  },
  z: {
    a: "ざ",
    i: "じ",
    u: "ず",
    e: "ぜ",
    o: "ぞ",
    y: {
      a: "じゃ",
      i: "じぃ",
      u: "じゅ",
      e: "じぇ",
      o: "じょ",
    },
  },
  j: {
    a: "じゃ",
    i: "じ",
    u: "じゅ",
    e: "じぇ",
    o: "じょ",
    y: {
      a: "じゃ",
      i: "じぃ",
      u: "じゅ",
      e: "じぇ",
      o: "じょ",
    },
  },
  d: {
    a: "だ",
    i: "ぢ",
    u: "づ",
    e: "で",
    o: "ど",
    h: {
      a: "でゃ",
      i: "でぃ",
      u: "でゅ",
      e: "でぇ",
      o: "でょ",
    },
    y: {
      a: "ぢゃ",
      i: "ぢぃ",
      u: "ぢゅ",
      e: "ぢぇ",
      o: "ぢょ",
    },
    w: {
      a: "どぁ",
      i: "どぃ",
      u: "どぅ",
      e: "どぇ",
      o: "どぉ",
    },
  },
  b: {
    a: "ば",
    i: "び",
    u: "ぶ",
    e: "べ",
    o: "ぼ",
    y: {
      a: "びゃ",
      i: "びぃ",
      u: "びゅ",
      e: "びぇ",
      o: "びょ",
    },
  },
  v: {
    a: "ゔぁ",
    i: "ゔぃ",
    u: "ゔ",
    e: "ゔぇ",
    o: "ゔぉ",
    y: {
      a: "ゔゃ",
      i: "ゔぃ",
      u: "ゔゅ",
      e: "ゔぇ",
      o: "ゔょ",
    },
  },
  p: {
    a: "ぱ",
    i: "ぴ",
    u: "ぷ",
    e: "ぺ",
    o: "ぽ",
    y: {
      a: "ぴゃ",
      i: "ぴぃ",
      u: "ぴゅ",
      e: "ぴぇ",
      o: "ぴょ",
    },
  },
  x: {
    a: "ぁ",
    i: "ぃ",
    u: "ぅ",
    e: "ぇ",
    o: "ぉ",
    y: {
      a: "ゃ",
      i: "ぃ",
      u: "ゅ",
      e: "ぇ",
      o: "ょ",
    },
    t: {
      u: "っ",
      s: {
        u: "っ",
      },
    },
    w: {
      a: "ゎ",
    },
    n: "ん",
    k: {
      a: "ゕ", // 実際には "ヵ" になる
      e: "ゖ", // 実際には "ヶ" になる
    },
  },
  l: {
    a: "ぁ",
    i: "ぃ",
    u: "ぅ",
    e: "ぇ",
    o: "ぉ",
    y: {
      a: "ゃ",
      i: "ぃ",
      u: "ゅ",
      e: "ぇ",
      o: "ょ",
    },
    t: {
      u: "っ",
      s: {
        u: "っ",
      },
    },
    w: {
      a: "ゎ",
    },
    k: {
      a: "ゕ", // 実際には "ヵ" になる
      e: "ゖ", // 実際には "ヶ" になる
    },
  },
};

export function romaToHira(roma: string): string {
  let result = "";
  let tmp = "";
  let index = 0;
  let node = tree;
  roma = roma.toLowerCase().replace(/[āīūēō]/g, (match) => {
    return match
      .replace(/ā/g, "a-")
      .replace(/ī/g, "i-")
      .replace(/ū/g, "u-")
      .replace(/ē/g, "e-")
      .replace(/ō/g, "o-");
  });
  const len = roma.length;

  const push = (char: string, toRoot = true) => {
    result += char;
    tmp = "";
    node = toRoot ? tree : node;
  };

  while (index < len) {
    let char = roma.charAt(index);
    if (char.match(/[a-z-]/)) {
      const prev = roma.charAt(index - 1);
      const nextChar = roma.charAt(index + 1);
      if (char in node) {
        const next = node[char];
        if (typeof next === "string") {
          push(next);
          // console.log("prev", prev, "char", char, "nextChar", nextChar, "roma", roma, "index", index, "result", result);
          if (prev === "n" && char === "n" && nextChar.match(/[aiueo]/)) {
            continue;
          }
        } else {
          tmp += roma.charAt(index);
          node = next;
        }
        index++;
        continue;
      }
      // const next = roma.charAt(index + 1);
      // console.log("prev", prev, "char", char, "roma", roma, "index", index);
      if (
        prev &&
        (prev === "n" || prev === char || (prev === "t" && char === "c"))
      ) {
        // console.log("push", prev === "n" ? "ん" : "っ", false);
        push(prev === "n" ? "ん" : "っ", false);
      }
      if (node !== tree && char in tree) {
        if (tmp === "n") {
          push("ん");
        } else {
          push(tmp);
        }
        continue;
      }
    }
    if (tmp === "n") {
      push("ん" + char);
    } else {
      push(tmp + char);
    }
    index++;
  }
  tmp = tmp.replace(/n$/, "ん");
  push(tmp);
  return result;
}

const table = {
  いぇ: "ye",
  うぁ: "wha",
  うぃ: "wi",
  うぇ: "we",
  うぉ: "who",
  ゔぁ: "va",
  ゔぃ: "vi",
  ゔぇ: "ve",
  ゔぉ: "vo",
  ゔゃ: "vya",
  ゔゅ: "vyu",
  ゔょ: "vyo",
  きゃ: "kya",
  きぃ: "kyi",
  きゅ: "kyu",
  きぇ: "kye",
  きょ: "kyo",
  ぎゃ: "gya",
  ぎぃ: "gyi",
  ぎゅ: "gyu",
  ぎぇ: "gye",
  ぎょ: "gyo",
  くぁ: "kwa",
  くぃ: "kwi",
  くぅ: "kwu",
  くぇ: "kwe",
  くぉ: "kwo",
  ぐぁ: "gwa",
  ぐぃ: "gwi",
  ぐぅ: "gwu",
  ぐぇ: "gwe",
  ぐぉ: "gwo",
  しゃ: "sha",
  しぃ: "syi",
  しゅ: "shu",
  しぇ: "she",
  しょ: "sho",
  じゃ: "ja",
  じぃ: "jyi",
  じゅ: "ju",
  じぇ: "je",
  じょ: "jo",
  ちゃ: "cha",
  ちぃ: "cyi",
  ちゅ: "chu",
  ちぇ: "che",
  ちょ: "cho",
  ぢゃ: "dya",
  ぢぃ: "dyi",
  ぢゅ: "dyu",
  ぢぇ: "dye",
  ぢょ: "dyo",
  つぁ: "tsa",
  つぃ: "tsi",
  つぇ: "tse",
  つぉ: "tso",
  てゃ: "tha",
  てぃ: "thi",
  てゅ: "thu",
  てぇ: "the",
  てょ: "tho",
  でゃ: "dha",
  でぃ: "di",
  でゅ: "dhu",
  でぇ: "dhe",
  でょ: "dho",
  とぁ: "twa",
  とぃ: "twi",
  とぅ: "twu",
  とぇ: "twe",
  とぉ: "two",
  どぁ: "dwa",
  どぃ: "dwi",
  どぅ: "dwu",
  どぇ: "dwe",
  どぉ: "dwo",
  にゃ: "nya",
  にぃ: "nyi",
  にゅ: "nyu",
  にぇ: "nye",
  にょ: "nyo",
  ひゃ: "hya",
  ひぃ: "hyi",
  ひゅ: "hyu",
  ひぇ: "hye",
  ひょ: "hyo",
  ぴゃ: "pya",
  ぴぃ: "pyi",
  ぴゅ: "pyu",
  ぴぇ: "pye",
  ぴょ: "pyo",
  びゃ: "bya",
  びぃ: "byi",
  びぇ: "bye",
  びゅ: "byu",
  びょ: "byo",
  ふぁ: "fa",
  ふぃ: "fi",
  ふぇ: "fe",
  ふぉ: "fo",
  ふゃ: "fya",
  ふゅ: "fyu",
  ふょ: "fyo",
  みゃ: "mya",
  みぃ: "myi",
  みゅ: "myu",
  みぇ: "mye",
  みょ: "myo",
  りゃ: "rya",
  りぃ: "ryi",
  りゅ: "ryu",
  りぇ: "rye",
  りょ: "ryo",
  あ: "a",
  い: "i",
  う: "u",
  え: "e",
  お: "o",
  か: "ka",
  き: "ki",
  く: "ku",
  け: "ke",
  こ: "ko",
  さ: "sa",
  し: "shi",
  す: "su",
  せ: "se",
  そ: "so",
  た: "ta",
  ち: "chi",
  つ: "tsu",
  て: "te",
  と: "to",
  な: "na",
  に: "ni",
  ぬ: "nu",
  ね: "ne",
  の: "no",
  は: "ha",
  ひ: "hi",
  ふ: "fu",
  へ: "he",
  ほ: "ho",
  ま: "ma",
  み: "mi",
  む: "mu",
  め: "me",
  も: "mo",
  や: "ya",
  ゆ: "yu",
  よ: "yo",
  ら: "ra",
  り: "ri",
  る: "ru",
  れ: "re",
  ろ: "ro",
  わ: "wa",
  を: "wo",
  ん: "n ",
  が: "ga",
  ぎ: "gi",
  ぐ: "gu",
  げ: "ge",
  ご: "go",
  ざ: "za",
  じ: "ji",
  ず: "zu",
  ぜ: "ze",
  ぞ: "zo",
  だ: "da",
  ぢ: "di",
  づ: "du",
  で: "de",
  ど: "do",
  ば: "ba",
  び: "bi",
  ぶ: "bu",
  べ: "be",
  ぼ: "bo",
  ぱ: "pa",
  ぴ: "pi",
  ぷ: "pu",
  ぺ: "pe",
  ぽ: "po",
  ぁ: "xa",
  ぃ: "xi",
  ぅ: "xu",
  ぇ: "xe",
  ぉ: "xo",
  ゃ: "xya",
  ゅ: "xyu",
  ょ: "xyo",
  ゎ: "xwa",
  ゕ: "xka", // 実際には "ヵ" になる
  ゖ: "xke", // 実際には "ヶ" になる
  ゔ: "vu",
  ゐ: "wyi",
  ゑ: "wye",
} as const;

const regTu = /っ([bcdfghjklmpqrstvwxyz])/gm;
const regXtu = /っ/gm;
const regProlong = /([aiueo])ー/gm;

export function hiraToRoma(str: string) {
  const max = str.length;
  let index = 0;
  let roma = "";

  while (index < max) {
    let char = "";
    const twoChars = str.substring(index, index + 2);
    const oneChar = str.substring(index, index + 1);
    if (twoChars in table) {
      char = table[twoChars as keyof typeof table] || twoChars;
      index += 2;
    } else {
      char = table[oneChar as keyof typeof table] || oneChar;
      index += 1;
    }
    roma += char;
  }
  roma = roma.replace(regTu, "$1$1");
  roma = roma.replace(regProlong, "$1$1");
  roma = roma.replace(regXtu, "xtu");
  return roma;
}
