import pinyin from "pinyin";
import Segment from "novel-segment";
import MeCab from "mecab-async";
import _ from "lodash";
import { kanaToHira } from "./kanaUtils";
import { FuriganaMapping } from "../models/FuriganaMapping";
import { loadDefaultJapaneseParser, type HTMLProcessingParser } from "budoux";
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
  partOfSpeech: string;
}

const mecab = new MeCab<MecabParsedResult>();
mecab.command =
  'mecab --node-format="%M\u200C%f[7]\u200C%pA\u200C%f[0],%f[1],%f[2],%f[3],%f[4],%f[5]\n" --unk-format="%M\u200C%M\u200C%pA\u200C%f[0],%f[1],%f[2],%f[3],%f[4],%f[5]\n" --marginal';
mecab.parser = function (data): MecabParsedResult {
  const [kanji, reading, alphaForwardLogRateStr, partOfSpeech] =
    data[0].split("\u200C");
  return {
    kanji,
    reading,
    alphaForwardLogRate: parseFloat(alphaForwardLogRateStr),
    isLineBreak: reading === undefined,
    partOfSpeech,
  };
};

const segment = new Segment();
segment.useDefault();

const dom = new JSDOM();
const budouxJa = loadDefaultJapaneseParser();

function budouSegmenterWithRuby(
  input: [string, string][],
  budoux: HTMLProcessingParser,
): [string, string][] {
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
          result.push([
            (node.textContent ?? "").replaceAll("\u200B", ""),
            node.dataset.ruby ?? "",
          ]);
        } else {
          result[result.length - 1][0] += node.textContent;
          result[result.length - 1][1] += node.dataset.ruby ?? "";
        }
      } else {
        result.push([
          (node.textContent ?? "").replaceAll("\u200B", ""),
          node.dataset.ruby ?? "",
        ]);
      }
    }
  }
  return result;
}

interface TransliterateOptions {
  language?: "zh" | "ja" | "en";
}

export interface SegmentedTransliterationOptions extends TransliterateOptions {
  type?: "typing" | "karaoke" | "plain" | "romaji";
  /**
   * Explicitly define furigana, will not go through machine furigana generation.
   * Only honored in Japanese language mode.
   */
  furigana?: FuriganaLabel[][];
  /**
   * Monoruby lookup function from dictionary.
   */
  convertMonoruby?: (text: string, furigana: string) => [string[], string[]];
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
  kana: string,
): (string | [string, string])[] {
  const [_, pre, post] = mixed.match(/^(\s*).+?(\s*)$/)!;
  kana = `${pre}${kana}${post}`;
  // 正規表現文 /(\p{sc=Hiragana}+)うさ(\p{sc=Hiragana}+)るさ/u のようなものを作る
  const pattern = new RegExp(
    kanaToHira(mixed).replace(/(\p{sc=Han}+)/gu, "(\\p{sc=Hiragana}+)"),
    "u",
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

type FuriganaDatabaseCache = Record<
  string,
  Record<string, ([string, string] | string)[]>
>;
/** Apply per-char furigana based on database info. */
async function applyFuriganaMapping(
  v: string | [string, string],
  cache?: FuriganaDatabaseCache,
  convertMonoruby?: (text: string, furigana: string) => [string[], string[]],
): Promise<(string | [string, string])[]> {
  if (typeof v === "string" || v[0].length < 2) {
    return [v];
  }
  const [text, furigana] = v;
  if (cache?.[text]?.[furigana]) {
    return cache[text][furigana];
  }
  let [{ segmentedText, segmentedFurigana }, created] =
    await FuriganaMapping.findOrCreate({
      where: { text, furigana },
    });
  if (convertMonoruby && (created || !segmentedText || !segmentedFurigana)) {
    const [textGroups, furiganaGroups] = convertMonoruby(text, furigana);
    if (textGroups.length > 1 && furiganaGroups.length > 1) {
      segmentedText = textGroups.join(",");
      segmentedFurigana = furiganaGroups.join(",");
      await FuriganaMapping.update(
        { segmentedText, segmentedFurigana },
        { where: { text, furigana } },
      );
      created = false;
    }
  }
  if (created || !segmentedText || !segmentedFurigana) {
    return [v];
  }
  const segTexts = segmentedText.split(","),
    segFurigana = segmentedFurigana.split(",");
  if (segTexts.length !== segFurigana.length) {
    return [v];
  }
  const result = segTexts.map<[string, string] | string>((text, idx) =>
    kanaToHira(text) === segFurigana[idx] || !segFurigana[idx]
      ? text
      : [text, segFurigana[idx]],
  );
  if (cache) {
    cache[text] = cache[text] ?? {};
    cache[text][furigana] = result;
  }
  return result;
}

/**
 * Transliterate text into phonetic readings, segmented into fragments for
 * display as ruby/furigana, typing guides, or karaoke-style highlights.
 *
 * The function auto-detects the language (Japanese, Chinese, or other) unless
 * explicitly specified, then applies language-specific transliteration:
 *
 * **Japanese (`ja`):**
 * 1. If explicit `furigana` labels are provided, groupings are built directly
 *    from them (no machine analysis). In `typing` mode, adjacent plain text is
 *    merged with the following furigana entry; in `karaoke`/`plain` mode each
 *    grouping is returned as-is.
 * 2. Otherwise, inline furigana notation (e.g. `漢字(かんじ)`) is extracted and
 *    replaced with private-use-area tokens, then MeCab parses the text into
 *    morphemes with readings. Results vary by `type`:
 *    - `plain` — one `[kanji, reading]` pair per MeCab word.
 *    - `typing` — words are accumulated into pending pairs and then re-segmented
 *      with BudouX for natural phrase boundaries.
 *    - `karaoke` — per-character furigana is separated via regex matching
 *      (`furiganaSeparator`), refined by database-backed monoruby mappings
 *      (`applyFuriganaMapping`), and whitespace around ruby items is normalized.
 *    - `romaji` — always uses MeCab for word boundaries (even when explicit
 *      furigana is present). Inline furigana notation is stripped (not replaced
 *      with PUA tokens) so MeCab sees real text. Per-word reading is resolved
 *      with fallback priority: explicit furigana → inline furigana → MeCab
 *      reading. If an explicit label overlaps multiple MeCab words, those words
 *      are merged into one segment. Output is hiragana; romaji conversion is
 *      the caller's responsibility.
 *
 * **Chinese (`zh`):**
 * Text is word-segmented with `novel-segment`, then each word is converted to
 * pinyin. `plain`/`romaji` joins pinyin per word, `typing` uses tone-stripped pinyin
 * separated by apostrophes, and `karaoke` produces per-character pinyin with
 * adjacent identical pairs merged.
 *
 * **Other languages:**
 * Lines are returned as identity pairs `[[text, text]]` with no transliteration.
 *
 * @param text Text to transliterate (may contain newlines for multi-line input)
 * @param options Options to adjust language, fragmentation strategy (`type`),
 *   explicit furigana labels, and monoruby lookup
 * @returns Array (lines) of arrays (segments) of `[original, transliterated]`
 */
export async function segmentedTransliteration(
  text: string,
  options?: SegmentedTransliterationOptions,
): Promise<[string, string][][]> {
  const type = options?.type ?? "plain";
  if (
    options?.language === "ja" ||
    (options?.language == null && jaOnly.test(text))
  ) {
    // transliterate as ja

    const hasFurigana = _.some(
      options?.furigana?.map((v) => v.length > 0) ?? [false],
    );

    if (hasFurigana && type !== "romaji") {
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
              [],
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
    // For "romaji" mode: extract inline furigana as position-mapped records
    // instead of PUA tokens, so MeCab sees clean text with real word boundaries.
    interface InlineFuriganaRecord {
      startInCleaned: number;
      endInCleaned: number;
      kanji: string;
      reading: string;
    }
    const inlineFuriganaRecords: InlineFuriganaRecord[] = [];
    if (!hasFurigana && type === "romaji") {
      // Strip inline furigana notation, keep kanji+okurigana, record positions
      const inlineRegex =
        /(\p{Script=Hani}+)[\(（]([\p{Script=Kana}ー]+|[\p{Script=Hira}ー]+)[\)）](\p{Script=Hira}*)/gu;
      let cleaned = "";
      let lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = inlineRegex.exec(text)) !== null) {
        // Append everything before this match
        cleaned += text.substring(lastIndex, match.index);
        const kanji = match[1];
        const reading = match[2];
        const okuri = match[3];
        const startInCleaned = [...cleaned].length;
        cleaned += kanji + okuri;
        const endInCleaned = [...cleaned].length;
        inlineFuriganaRecords.push({
          startInCleaned,
          endInCleaned,
          kanji,
          reading: reading + okuri,
        });
        lastIndex = match.index + match[0].length;
      }
      cleaned += text.substring(lastIndex);
      text = cleaned;
    } else if (!hasFurigana) {
      let nextToken = 0xe000;
      text = text.replace(
        /(\p{Script=Hani}+)[\(（]([\p{Script=Kana}ー]+|[\p{Script=Hira}ー]+)[\)）](\p{Script=Hira}*)/gu,
        (match, p1, p2, p3): string => {
          const answer = String.fromCharCode(nextToken);
          tokenMapping[answer] = [p1, p2, p3];
          nextToken++;
          return answer;
        },
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
      [[]],
    );

    const furiganaMappingCache: FuriganaDatabaseCache = {};

    // Per-line character offset tracking for explicit furigana in romaji mode
    const lineCharOffsets: number[] = [];
    if (type === "romaji") {
      let offset = 0;
      const textLines = text.split("\n");
      for (const line of textLines) {
        lineCharOffsets.push(offset);
        offset += [...line].length + 1; // +1 for \n
      }
    }

    return await Promise.all(
      lines.map(async (words, lineIdx) => {
        const result: [string, string][] = [];
        let pending: [string, string] = ["", ""];

        switch (type) {
          case "romaji": {
            // Build word entries with character positions
            interface WordEntry {
              kanji: string;
              reading: string;
              charStart: number;
              charEnd: number;
            }
            const wordEntries: WordEntry[] = [];
            let charPos = 0;
            // POS prefixes that should be merged with the preceding word
            const mergePOSPrefixes = [
              "助詞,接続助詞",
              "助詞,終助詞",
              "助詞,格助詞,連語",
              "助動詞",
              "動詞,接尾",
              "動詞,非自立",
              "名詞,非自立",
            ];
            for (const x of words) {
              const len = [...x.kanji].length;
              const shouldMerge =
                wordEntries.length > 0 &&
                mergePOSPrefixes.some((prefix) =>
                  x.partOfSpeech?.startsWith(prefix),
                );
              if (shouldMerge) {
                const prev = wordEntries[wordEntries.length - 1];
                prev.kanji += x.kanji;
                prev.reading =
                  prev.reading === "*"
                    ? x.reading
                    : x.reading === "*"
                    ? prev.reading
                    : prev.reading + x.reading;
                prev.charEnd = charPos + len;
              } else {
                wordEntries.push({
                  kanji: x.kanji,
                  reading: x.reading,
                  charStart: charPos,
                  charEnd: charPos + len,
                });
              }
              charPos += len;
            }

            // Merge MeCab words that overlap with explicit furigana labels
            const lineOffset = lineCharOffsets[lineIdx] ?? 0;
            const lineFurigana = hasFurigana
              ? options?.furigana?.[lineIdx] ?? []
              : [];

            const mergedEntries: WordEntry[] = [];
            let i = 0;
            while (i < wordEntries.length) {
              const entry = wordEntries[i];
              // Check if any explicit furigana label overlaps this word
              const overlapping = lineFurigana.find(
                (f) =>
                  f.leftIndex < entry.charEnd && f.rightIndex > entry.charStart,
              );
              if (overlapping) {
                // Merge all words that this furigana label overlaps
                let merged = { ...entry };
                let j = i + 1;
                while (
                  j < wordEntries.length &&
                  overlapping.rightIndex > wordEntries[j].charStart
                ) {
                  merged = {
                    kanji: merged.kanji + wordEntries[j].kanji,
                    reading:
                      merged.reading === "*"
                        ? wordEntries[j].reading
                        : wordEntries[j].reading === "*"
                        ? merged.reading
                        : merged.reading + wordEntries[j].reading,
                    charStart: merged.charStart,
                    charEnd: wordEntries[j].charEnd,
                  };
                  j++;
                }
                mergedEntries.push(merged);
                i = j;
              } else {
                mergedEntries.push(entry);
                i++;
              }
            }

            // Resolve furigana for each (possibly merged) word
            for (const entry of mergedEntries) {
              const { kanji, reading, charStart, charEnd } = entry;

              // 1. Explicit furigana: find a label that covers this word range
              const explicitLabel = lineFurigana.find(
                (f) => f.leftIndex <= charStart && f.rightIndex >= charEnd,
              );
              if (explicitLabel) {
                result.push([kanji, explicitLabel.content]);
                continue;
              }

              // 2. Inline furigana: check if inline records cover this word
              // (line-local positions — inline records are global, adjust by lineOffset)
              const globalStart = lineOffset + charStart;
              const globalEnd = lineOffset + charEnd;
              const inlineMatches = inlineFuriganaRecords.filter(
                (r) =>
                  r.startInCleaned >= globalStart &&
                  r.endInCleaned <= globalEnd,
              );
              if (inlineMatches.length > 0) {
                // Reconstruct reading from inline matches covering portions of the word
                let inlineReading = "";
                let pos = globalStart;
                for (const m of inlineMatches) {
                  // Any gap before this inline match uses MeCab reading (approximate)
                  if (m.startInCleaned > pos) {
                    const gapText = [...kanji]
                      .slice(pos - globalStart, m.startInCleaned - globalStart)
                      .join("");
                    inlineReading += kanaToHira(gapText);
                  }
                  inlineReading += m.reading;
                  pos = m.endInCleaned;
                }
                // Any trailing gap
                if (pos < globalEnd) {
                  const gapText = [...kanji].slice(pos - globalStart).join("");
                  inlineReading += kanaToHira(gapText);
                }
                result.push([kanji, inlineReading]);
                continue;
              }

              // 3. MeCab fallback
              if (jaOnly.test(kanji) || isHan.test(kanji)) {
                const leadingSpaces = /^\s+/.exec(kanji);
                let mecabReading = reading;
                if (leadingSpaces && !/^\s+/.exec(mecabReading)) {
                  mecabReading = leadingSpaces[0] + mecabReading;
                }
                result.push([
                  kanji,
                  kanaToHira(mecabReading === "*" ? kanji : mecabReading),
                ]);
              } else {
                result.push([kanji, kanji]);
              }
            }
            return result;
          }
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
                      `key ${v.charCodeAt(
                        0,
                      )} is not found in the mapping list.`,
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
                  x.reading === "*" ? x.kanji : x.reading,
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
                          `key ${v.charCodeAt(0)} is not found in the mapping.`,
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
                        hira,
                      );
                      for (const frgn of separatedFuriganas) {
                        (
                          await applyFuriganaMapping(
                            frgn,
                            furiganaMappingCache,
                            options?.convertMonoruby,
                          )
                        ).forEach((v) => result.push(v));
                      }
                    }
                  } else {
                    result.push(x.kanji);
                  }
                  return result;
                  // For each word from MeCab, a list of str or str pair is built
                  // pair is for substitution, single string is for plain text
                }),
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
                        `key ${v.charCodeAt(0)} is not found in the mapping.`,
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
                    ["", ""],
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
      }),
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
      [[]],
    );

    return lines.map((words) => {
      switch (type) {
        case "karaoke":
          return words
            .map<[string, string][]>((word) => {
              const py = pinyin(word, { segment: true, heteronym: true }).map(
                (x) => x[0],
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
        case "romaji":
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
  options?: TransliterateOptions,
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
