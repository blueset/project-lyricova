import pinyin from "pinyin";
import Segment from "novel-segment";
import MeCab from "mecab-async";
import _ from "lodash";
import { diffChars } from "diff";

/** List of commonly used characters that is only used in Japanese */
const jaOnly = /(\p{Script=Hira}|\p{Script=Kana}|[゛゜゠ーｰ���〱〲〳〴〵゛゜゠・ー･ｰ����㍻㍼㍽㍾㍿増楽薬霊塡犠渓著雑祖猟槇祉栄畳福込帰朗鉱獣砕呉響碑捗僧繊粋瀬繁層厳隠変頬剰拠剤斎専琢廃匂巣転黒社舗蔵伝歩鋳餠愼験抜読猪廊郞曽仮駅譲欄酔桟済気斉囲択経乗満穀難錬嘆戻醸虜寛銭様歳毎奨艶帯侮挙逸署器両釈節墨挿従権憎嬢都倹豊戦庁謁卑歓駆観揺徴悪徳壌団暑営娯弾渇恵祝縁枠勤隣対漢謹検卽摂類視発緖壊拡粛掲涙穏総圏拝沢贈圧浄顔仏図陥歴亀壱梅眞煮闘髪円扱塩騒懐覚敏軽峠戸頼荘黙晩諸継蛍遅逓祥練喩応悩姫険齢撃聴覧痩値鉄禍塀続勉臭鶏辺縄悔絵郷捜懲者鬪海児実薫亜渚歯駄渋弐広姉巻剣証塁単顕価禎祐突穂暦払栃訳渉県労麺糸焼勲神舎縦賓髄丼暁桜滝脳稲勧鎭祈売])/u;
/** Test the string if has Han characters */
const isHan = /\p{Script=Han}/u;

interface MecabParsedResult {
  kanji: string;
  reading: string;
  alphaForwardLogRate: number;
}

const mecab = new MeCab<MecabParsedResult>();
mecab.command = "mecab -d /usr/local/lib/mecab/dic/mecab-ipadic-neologd --node-format=\"%M\u200C%f[7]\u200C%pA\n\" --unk-format=\"%M\u200C%M\u200C%pA\n\" --marginal";
mecab.parser = function (data): MecabParsedResult {
  const [kanji, reading, alphaForwardLogRateStr] = data[0].split("\u200C");
  return {
    kanji,
    reading,
    alphaForwardLogRate: parseFloat(alphaForwardLogRateStr),
  };
};

const segment = new Segment();
segment.useDefault();

/**
 * Convert katakana to hiragana.
 * @param str katakana
 */
export function kanaToHira(str: string): string {
  return str.replace(/[\u30a1-\u30f6]/g,
    match => String.fromCharCode(match.charCodeAt(0) - 0x60)
  );
}

interface TransliterateOptions {
  language?: "zh" | "ja" | "en";
}

export interface SegmentedTransliterationOptions extends TransliterateOptions {
  type?: "typing" | "karaoke" | "plain";
}

function notPunct(text: string): boolean {
  return Boolean(text.match(/\p{Letter}/ug));
}

function kanaComparator(source: string, dest: string): boolean {
  return kanaToHira(source) === kanaToHira(dest);
}

/**
 * Transliterate text with fragmentations.
 * @param text Text to transliterate
 * @param options Options to adjust fragmentation strategy
 * @returns Array of [original, transliterated]
 */
export function segmentedTransliteration(text: string, options?: SegmentedTransliterationOptions): [string, string][] {
  const type = options?.type ?? "plain";
  if (options?.language === "ja" || (options?.language == null && jaOnly.test(text))) {
    // transliterate as ja
    const words = mecab.parseSyncFormat(text);

    const result: [string, string][] = [];
    let pending: [string, string] = ["", ""];
    switch (type) {
      case "typing":
        let lastScore = 0;
        let currDiff = 0;
        if (words.length < 1) return [];
        words.forEach((x, idx) => {
          if (idx !== 0) {
            currDiff = lastScore - x.alphaForwardLogRate - 1000;
            if (currDiff > 0 && notPunct(x.kanji)) {
              result.push(pending);
              pending = ["", ""];
            }
          }
          lastScore = x.alphaForwardLogRate;
          pending[0] += x.kanji;
          pending[1] += kanaToHira(x.reading === "*" ? x.kanji : x.reading);
        });

        if (pending[0] !== "" || pending[1] !== "") {
          result.push(pending);
        }
        return result;
      case "karaoke":
        return words.map(x => {
          const result: (string | [string, string])[] = [];
          let pending: [string, string] = ["", ""];
          let isPending = false;
          if (jaOnly.test(x.kanji) || isHan.test(x.kanji)) {
            const hira = kanaToHira(x.reading || x.kanji);
            if (hira === x.kanji) {
              result.push(x.kanji);
            } else {
              // @ts-ignore
              diffChars(hira, x.kanji, { comparator: kanaComparator }).forEach((v) => {
                if (v.added || v.removed) {
                  if (v.removed) pending[1] = v.value;
                  else pending[0] = v.value;
                  if (isPending) {
                    // Found a pair of match
                    result.push(pending);
                    pending = ["", ""];
                  }
                  isPending = !isPending;
                } else {
                  // Not replaced.
                  result.push(v.value);
                }
              });
            }
          } else {
            result.push(x.kanji);
          }
          return result;
          // For each word from MeCab, a list of str or str pair is built
          // pair is for substitution, single string is for plain text
        }).reduce<[string, string][]>((prev, curr) => {
          // join adjacent plain blocks together and convert to the
          // substitution format.
          curr.forEach((v) => {
            if (typeof v === "string") {
              if (prev.length > 0 && prev[prev.length - 1][0] === prev[prev.length - 1][1]) {
                prev[prev.length - 1][0] += v;
                prev[prev.length - 1][1] += v;
              } else {
                prev.push([v, v]);
              }
            } else {
              prev.push(v);
            }
          });
          return prev;
        }, []);
      case "plain":
      default:
        return words.map(x => {
          if (jaOnly.test(x.kanji) || isHan.test(x.kanji)) {
            return [x.kanji, kanaToHira(x.reading || x.kanji)];
          }
          return [x.kanji, x.kanji];
        });
    }

  } else if (options?.language === "zh" || (options?.language == null && isHan.test(text))) {
    // transliterate as zh
    const words: string[] = segment.doSegment(text, { simple: true });

    switch (type) {
      case "karaoke":
        return words.map(
          word => {
            const py = pinyin(word, { segment: true, heteronym: true }).map(x => x[0]);
            const chars = [...word];
            if (py.length === chars.length) {
              return _.zip(chars, py);
            }
            return [[word, py.join(" ")]] as [string, string][];
          }
        ).reduce((prev, curr) => prev.concat(curr), [])
          .reduce<[string, string][]>((prev, curr) => {
            if (curr[0] !== curr[1] || prev.length < 1 || prev[prev.length - 1][0] !== prev[prev.length - 1][1]) {
              prev.push(curr);
            } else {
              prev[prev.length - 1][0] += curr[0];
              prev[prev.length - 1][1] += curr[1];
            }
            return prev;
          }, []);
      case "typing":
        return words.map(
          word => [word, pinyin(word, { segment: true, heteronym: true, style: pinyin.STYLE_NORMAL }).map(x => x[0]).join("'")]
        );
      case "plain":
      default:
        return words.map(
          word => [word, pinyin(word, { segment: true, heteronym: true }).map(x => x[0]).join("")]
        );
    }
  } else {
    // No asian text found
    return [[text, text]];
  }
}


export function transliterate(text: string, options?: TransliterateOptions): string {
  if (options?.language === "ja" || (options?.language == null && jaOnly.test(text))) {
    // transliterate as ja
    return segmentedTransliteration(text, { type: "plain", language: "ja" }).map((v) => v[1]).join("");
  } else if (options?.language === "zh" || (options?.language == null && isHan.test(text))) {
    // transliterate as zh
    return segmentedTransliteration(text, { type: "plain", language: "zh" }).map((v) => v[1]).join(" ");
  } else {
    // No asian text found
    return text;
  }
}
