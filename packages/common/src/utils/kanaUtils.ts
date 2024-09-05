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
  const len = roma.length;
  roma = roma.toLowerCase().replace(/[āīūēō]/g, (match) => {
    return match.replace(/ā/g, "a-").replace(/ī/g, "i-").replace(/ū/g, "u-").replace(/ē/g, "e-").replace(/ō/g, "o-");
  });

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
      if (prev && (prev === "n" || prev === char)) {
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
