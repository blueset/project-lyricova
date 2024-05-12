import pinyin from "pinyin";
import Segment from "novel-segment";
import MeCab from "mecab-async";
import _ from "lodash";
import { kanaToHira } from "./kanaUtils";
import { FuriganaMapping } from "../models/FuriganaMapping";
import { loadDefaultJapaneseParser, type HTMLProcessingParser } from 'budoux';
import { JSDOM } from "jsdom";

interface FuriganaLabel {
  content: string;
  leftIndex: number;
  rightIndex: number;
}

/** List of commonly used characters that is only used in Japanese */
const jaOnly =
  /(\p{Script=Hira}|\p{Script=Kana}|[゛゜゠ーｰ���〱〲〳〴〵゛゜゠・ー･ｰ����㍻㍼㍽㍾㍿増楽薬霊塡犠渓著雑祖猟槇祉栄畳福込帰朗鉱獣砕呉響碑捗僧繊粋瀬繁層厳隠変頬剰拠剤斎専琢廃匂巣転黒社舗蔵伝歩鋳餠愼験抜読猪廊郞曽仮駅譲欄酔桟済気斉囲択経乗満穀難錬嘆戻醸虜寛銭様歳毎奨艶帯侮挙逸署器両釈節墨挿従権憎嬢都倹豊戦庁謁卑歓駆観揺徴悪徳壌団暑営娯弾渇恵祝縁枠勤隣対漢謹検卽摂類視発緖壊拡粛掲涙穏総圏拝沢贈圧浄顔仏図陥歴亀壱梅眞煮闘髪円扱塩騒懐覚敏軽峠戸頼荘黙晩諸継蛍遅逓祥練喩応悩姫険齢撃聴覧痩値鉄禍塀続勉臭鶏辺縄悔絵郷捜懲者鬪海児実薫亜渚歯駄渋弐広姉巻剣証塁単顕価禎祐突穂暦払栃訳渉県労麺糸焼勲神舎縦賓髄丼暁桜滝脳稲勧鎭祈売])/u;
/** Test the string if has Han characters */
const isHan = /\p{Script=Han}/u;

interface MecabParsedResult {
  kanji: string;
  reading: string;
  alphaForwardLogRate: number;

  isLineBreak: boolean;
}

const mecab = new MeCab<MecabParsedResult>();
mecab.command =
  'mecab --node-format="%M\u200C%f[7]\u200C%pA\n" --unk-format="%M\u200C%M\u200C%pA\n" --marginal';
mecab.parser = function (data): MecabParsedResult {
  const [kanji, reading, alphaForwardLogRateStr] = data[0].split("\u200C");
  return {
    kanji,
    reading,
    alphaForwardLogRate: parseFloat(alphaForwardLogRateStr),
    isLineBreak: reading === undefined,
  };
};

const segment = new Segment();
segment.useDefault();

const dom = new JSDOM();
const budouxJa = loadDefaultJapaneseParser();

function budouSegmenterWithRuby(input: [string, string][], budoux: HTMLProcessingParser): [string, string][] {
  // convert input into HTML via JSDOM
  let container = dom.window.document.createElement("span");
  input.forEach(([text, ruby]) => {
    if (text.trim() === ruby.trim()) {
      container.appendChild(dom.window.document.createTextNode(text));
    } else {
      const wrapper = dom.window.document.createElement("span");
      wrapper.textContent = text;
      wrapper.dataset.ruby = ruby;
      container.appendChild(wrapper);
    }
  });
  const segmentedHTML = budoux.translateHTMLString(container.innerHTML);
  container.innerHTML = segmentedHTML;
  container = container.firstElementChild as HTMLElement;
  // convert back to text
  const result: [string, string][] = [];
  for (const node of container.childNodes) {
    if (node instanceof dom.window.Text) {
      node.textContent?.split("\u200B").forEach((v, idx) => {
        if (!v) return;
        if (idx === 0 && result.length > 0) {
          result[result.length - 1][0] += v;
          result[result.length - 1][1] += v;
        } else {
          result.push([v, v]);
        }
      });
    } else if (node instanceof dom.window.HTMLElement) {
      if (!node.textContent?.startsWith("\u200B")) {
        if (result.length === 0) {
          result.push([(node.textContent ?? "").replaceAll("\u200B", ""), node.dataset.ruby ?? ""]);
        } else {
          result[result.length - 1][0] += node.textContent;
          result[result.length - 1][1] += node.dataset.ruby ?? "";
        }
      } else {
        result.push([(node.textContent ?? "").replaceAll("\u200B", ""), node.dataset.ruby ?? ""]);
      }
    }
  }
  return result;
}

interface TransliterateOptions {
  language?: "zh" | "ja" | "en";
}

export interface SegmentedTransliterationOptions extends TransliterateOptions {
  type?: "typing" | "karaoke" | "plain";
  /**
   * Explicitly define furigana, will not go through machine furigana generation.
   * Only honored in Japanese language mode.
   */
  furigana?: FuriganaLabel[][];
}

function notPunct(text: string): boolean {
  return Boolean(text.match(/\p{Letter}/gu));
}

interface LevenshteinCellState {
  distance: number;
  prev: [number, number];
  type?: "insert" | "remove" | "replace";
}

/**
 * @author mkpoli
 * @url https://zenn.dev/mkpoli/articles/8269f2f3ce71c9
 */
function furiganaSeparator(
  mixed: string,
  kana: string
): (string | [string, string])[] {
  const [_, pre, post] = mixed.match(/^(\s*).+?(\s*)$/)!;
  kana = `${pre}${kana}${post}`;
  // 正規表現文 /(\p{sc=Hiragana}+)うさ(\p{sc=Hiragana}+)るさ/u のようなものを作る
  const pattern = new RegExp(
    kanaToHira(mixed).replace(/(\p{sc=Han}+)/gu, "(\\p{sc=Hiragana}+)"),
    "u"
  );

  // 作った正規表現文で仮名表記をマッチさせて、「お」「き」を取得する
  const groups = kana.match(pattern);
  if (!groups) return [[mixed, kana]];
  const [, ...rest] = groups;

  // 混じり表記の文を漢字部分とそうでない部分を分ける [ '逢', 'うさ', '離', 'るさ' ]
  const sections = mixed.split(/(\p{sc=Han}+)/u).filter(Boolean);

  // 最後に分けた部分に必要な場合だけルビを振る
  return sections.map((section) => {
    if (section.match(/\p{sc=Han}+/u)) {
      const kana = rest.shift() ?? "";
      if (kanaToHira(section) === kana) {
        return section;
      }
      return [section, kana];
    } else {
      return section;
    }
  });
}

type FuriganaDatabaseCache = Record<string, Record<string, ([string, string] | string)[]>>;
/** Apply per-char furigana based on database info. */
async function applyFuriganaMapping(
  v: string | [string, string],
  cache?: FuriganaDatabaseCache
): Promise<(string | [string, string])[]> {
  if (typeof v === "string" || v[0].length < 2) {
    return [v];
  }
  const [text, furigana] = v;
  if (cache?.[text]?.[furigana]) {
    return cache[text][furigana];
  }
  const [{ segmentedText, segmentedFurigana }, created] =
    await FuriganaMapping.findOrCreate({
      where: { text, furigana },
    });
  if (created || !segmentedText || !segmentedFurigana) {
    return [v];
  }
  const segTexts = segmentedText.split(","),
    segFurigana = segmentedFurigana.split(",");
  if (segTexts.length !== segFurigana.length) {
    return [v];
  }
  const result = segTexts.map<[string, string] | string>((text, idx) => 
    (kanaToHira(text) === segFurigana[idx] || !segFurigana[idx]) ? 
    text : [
      text,
      segFurigana[idx],
    ]
  );
  if (cache) {
    cache[text] = cache[text] ?? {};
    cache[text][furigana] = result;
  }
  return result;
}

/**
 * Transliterate text with fragmentations.
 * @param text Text to transliterate
 * @param options Options to adjust fragmentation strategy
 * @returns Array (lines) of arrays (words) of [original, transliterated]
 */
export async function segmentedTransliteration(
  text: string,
  options?: SegmentedTransliterationOptions
): Promise<[string, string][][]> {
  const type = options?.type ?? "plain";
  if (
    options?.language === "ja" ||
    (options?.language == null && jaOnly.test(text))
  ) {
    // transliterate as ja

    const hasFurigana = _.some(
      options?.furigana?.map((v) => v.length > 0) ?? [false]
    );

    if (hasFurigana) {
      return text.split("\n").map((base, idx) => {
        // Build groupings from explicit furigana
        const groupings: (string | [string, string])[] = [];
        let ptr = 0;
        const furigana = options?.furigana?.[idx];
        if (!furigana) return [[base, base]];

        furigana.forEach(({ content, leftIndex: start, rightIndex: end }) => {
          if (start > ptr) {
            groupings.push(base.substring(ptr, start));
          }
          groupings.push([base.substring(start, end), content]);
          ptr = end;
        });
        if (ptr < base.length) groupings.push(base.substring(ptr));

        // Join groupings accordingly
        switch (type) {
          case "typing":
            return groupings.reduce<[string, string][]>(
              (prev, curr, idx, arr) => {
                if (
                  // First entry, or
                  prev.length < 1 ||
                  // this is a furigana, and previous one is plain text.
                  (idx > 0 &&
                    typeof curr !== "string" &&
                    typeof arr[idx - 1] === "string")
                ) {
                  // add new entry
                  if (typeof curr === "string") prev.push([curr, curr]);
                  else prev.push(curr);
                } else {
                  // Merge with before
                  const last = prev[prev.length - 1];
                  if (typeof curr === "string") {
                    last[0] = last[0] + curr;
                    last[1] = last[1] + curr;
                  } else {
                    last[0] = last[0] + curr[0];
                    last[1] = last[1] + curr[1];
                  }
                }
                return prev;
              },
              []
            );
          case "karaoke":
          case "plain":
          default:
            return groupings.map((v) => {
              if (typeof v === "string") return [v, v];
              return v;
            });
        }
      });
    }

    // Convert inline furigana to tokens. Skip if explicit furigana presents.
    const tokenMapping: { [token: string]: [string, string, string] } = {};
    if (!hasFurigana) {
      let nextToken = 0xe000;
      text = text.replace(
        /(\p{Script=Hani}+)[\(（]([\p{Script=Kana}ー]+|[\p{Script=Hira}ー]+)[\)）](\p{Script=Hira}*)/gu,
        (match, p1, p2, p3): string => {
          const answer = String.fromCharCode(nextToken);
          tokenMapping[answer] = [p1, p2, p3];
          nextToken++;
          return answer;
        }
      );
    }
    const words = mecab.parseSyncFormat(text);
    const lines = words.reduce<MecabParsedResult[][]>(
      (prev, curr) => {
        if (curr.isLineBreak) {
          prev.push([]);
        } else {
          curr.kanji = curr.kanji.replace(/\\!/g, "!");
          prev[prev.length - 1].push(curr);
        }
        return prev;
      },
      [[]]
    );

    const furiganaMappingCache: FuriganaDatabaseCache = {};

    return await Promise.all(
      lines.map(async (words) => {
        const result: [string, string][] = [];
        let pending: [string, string] = ["", ""];

        switch (type) {
          case "typing":
            if (words.length < 1) return [];
            words.forEach((x) => {
              if (/[\uE000-\uF8FF]/.test(x.kanji)) {
                // Expand inline furigana
                if (pending[0] !== "" && pending[1] !== "") {
                  result.push(pending);
                  pending = ["", ""];
                }
                [...x.kanji].forEach((v) => {
                  if (v in tokenMapping) {
                    const [kanji, kana, okuri] = tokenMapping[v];
                    result.push([kanji, kana]);
                    result.push([okuri, okuri]);
                  } else {
                    console.error(
                      `key ${v.charCodeAt(0)} is not found in the mapping list.`
                    );
                  }
                });
              } else {
                if (pending[0] !== "" && pending[1] !== "") {
                  result.push(pending);
                  pending = ["", ""];
                }
                pending[0] += x.kanji;
                pending[1] += kanaToHira(
                  x.reading === "*" ? x.kanji : x.reading
                );
              }
            });

            if (pending[0] !== "" || pending[1] !== "") {
              result.push(pending);
            }
            return budouSegmenterWithRuby(result, budouxJa);
          case "karaoke":
            return (
              await Promise.all(
                words.map(async (x) => {
                  const result: (string | [string, string])[] = [];
                  if (/[\uE000-\uF8FF]/.test(x.kanji)) {
                    // Expand inline furigana
                    [...x.kanji].forEach((v) => {
                      if (v in tokenMapping) {
                        const [kanji, kana, okuri] = tokenMapping[v];
                        result.push([kanji, kana]);
                        result.push(okuri);
                      } else {
                        console.error(
                          `key ${v.charCodeAt(0)} is not found in the mapping.`
                        );
                      }
                    });
                  } else if (jaOnly.test(x.kanji) || isHan.test(x.kanji)) {
                    const hira = kanaToHira(x.reading || x.kanji);
                    if (hira === x.kanji) {
                      result.push(x.kanji);
                    } else {
                      const separatedFuriganas = furiganaSeparator(
                        x.kanji,
                        hira
                      );
                      for (const frgn of separatedFuriganas) {
                        (
                          await applyFuriganaMapping(frgn, furiganaMappingCache)
                        ).forEach((v) => result.push(v));
                      }
                    }
                  } else {
                    result.push(x.kanji);
                  }
                  return result;
                  // For each word from MeCab, a list of str or str pair is built
                  // pair is for substitution, single string is for plain text
                })
              )
            )
              .reduce<[string, string][]>((prev, curr) => {
                // join adjacent plain blocks together and convert to the
                // substitution format.
                curr.forEach((v) => {
                  if (typeof v === "string") {
                    if (
                      prev.length > 0 &&
                      prev[prev.length - 1][0] === prev[prev.length - 1][1]
                    ) {
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
              }, [])
              .reduce<[string, string][]>((prev, [text, ruby]) => {
                // Normalize whitespaces around a ruby item.
                const [_t, textL, textC, textR] =
                  text.match(/^(\s*)(.*?)(\s*)$/u)!;
                const [_r, rubyL, rubyC, rubyR] =
                  ruby.match(/^(\s*)(.*?)(\s*)$/u)!;
                if (textL.length > 0 || rubyL.length > 0) {
                  const spaceL: [string, string] = [textL, rubyL];
                  if (textL.length === 0) spaceL[0] = rubyL;
                  else if (rubyL.length === 0) spaceL[1] = textL;
                  if (
                    prev.length > 0 &&
                    prev[prev.length - 1][0] === prev[prev.length - 1][1]
                  ) {
                    prev[prev.length - 1][0] += spaceL[0];
                    prev[prev.length - 1][1] += spaceL[1];
                  } else {
                    prev.push(spaceL);
                  }
                }
                prev.push([textC, rubyC]);
                if (textR.length > 0 || rubyR.length > 0) {
                  if (textR.length === 0) prev.push([rubyR, rubyR]);
                  else if (rubyR.length === 0) prev.push([textR, textR]);
                  else prev.push([textR, rubyR]);
                }
                return prev;
              }, []);
          case "plain":
          default:
            return words.map((x) => {
              if (/[\uE000-\uF8FF]/g.test(x.kanji)) {
                // Expand inline furigana
                return [...x.kanji]
                  .map((v) => {
                    if (v in tokenMapping) {
                      const [kanji, kana, okuri] = tokenMapping[v];
                      return [`${kanji}${okuri}`, `${kana}${okuri}`];
                    } else {
                      console.error(
                        `key ${v.charCodeAt(0)} is not found in the mapping.`
                      );
                      return ["", ""];
                    }
                  })
                  .reduce<[string, string]>(
                    (prev, curr) => {
                      prev[0] += curr[0];
                      prev[1] += curr[1];
                      return prev;
                    },
                    ["", ""]
                  );
              } else if (jaOnly.test(x.kanji) || isHan.test(x.kanji)) {
                // Solve problem where output maybe like [" 初音ミク", "はつねみく"]
                const leadingSpaces = /^\s+/.exec(x.kanji);
                if (leadingSpaces && !/^\s+/.exec(x.reading)) {
                  x.reading = leadingSpaces[0] + x.reading;
                }
                return [x.kanji, kanaToHira(x.reading || x.kanji)];
              }
              return [x.kanji, x.kanji];
            });
        }
      })
    );
  } else if (
    options?.language === "zh" ||
    (options?.language == null && isHan.test(text))
  ) {
    // transliterate as zh
    const words: string[] = segment.doSegment(text, { simple: true });
    const lines = words.reduce<string[][]>(
      (prev, curr) => {
        if (/\n+/.test(curr)) {
          for (let i = 0; i < curr.length; i++) prev.push([]);
        } else {
          prev[prev.length - 1].push(curr);
        }
        return prev;
      },
      [[]]
    );

    return lines.map((words) => {
      switch (type) {
        case "karaoke":
          return words
            .map<[string, string][]>((word) => {
              const py = pinyin(word, { segment: true, heteronym: true }).map(
                (x) => x[0]
              );
              const chars = [...word];
              if (py.length === chars.length) {
                return _.zip(chars, py) as [string, string][];
              }
              return [[word, py.join(" ")]];
            })
            .reduce((prev, curr) => prev.concat(curr), [])
            .reduce<[string, string][]>((prev, curr) => {
              if (
                curr[0] !== curr[1] ||
                prev.length < 1 ||
                prev[prev.length - 1][0] !== prev[prev.length - 1][1]
              ) {
                prev.push(curr);
              } else {
                prev[prev.length - 1][0] += curr[0];
                prev[prev.length - 1][1] += curr[1];
              }
              return prev;
            }, []);
        case "typing":
          return words.map((word) => [
            word,
            pinyin(word, {
              segment: true,
              heteronym: true,
              style: pinyin.STYLE_NORMAL,
            })
              .map((x) => x[0])
              .join("'"),
          ]);
        case "plain":
        default:
          return words.map((word) => [
            word,
            pinyin(word, { segment: true, heteronym: true })
              .map((x) => x[0])
              .join(""),
          ]);
      }
    });
  } else {
    // No asian text found
    return text.split("\n").map((v) => [[v, v]]);
  }
}

export function getLanguage(text: string): "ja" | "zh" | "en" {
  if (jaOnly.test(text)) return "ja";
  if (isHan.test(text)) return "zh";
  return "en";
}

export async function transliterate(
  text: string,
  options?: TransliterateOptions
): Promise<string> {
  const language = options?.language ?? getLanguage(text);
  if (language === "ja") {
    // transliterate as ja
    return (
      await segmentedTransliteration(text, { type: "plain", language: "ja" })
    )
      .map((line) => line.map((v) => v[1]).join(""))
      .join("\n");
  } else if (language === "zh") {
    // transliterate as zh
    return (
      await segmentedTransliteration(text, { type: "plain", language: "zh" })
    )
      .map((line) => line.map((v) => v[1]).join(" "))
      .join("\n");
  } else {
    // No asian text found
    return text;
  }
}
