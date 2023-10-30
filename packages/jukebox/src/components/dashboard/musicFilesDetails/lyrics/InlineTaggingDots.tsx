import { FURIGANA, LyricsLine, RangeAttributeLabel } from "lyrics-kit/core";

const pattern =
  "(([あいうえおアイウエオゕゖヵヶてでテデんン]|[かがさざただなはばぱまやらわカガサザタダナハバパマヤラワヷ][あア]*|[きぎしじちぢにひびぴみりゐキギシジチヂニヒビピミリヰヸ]([ゃャ]|[ゅょュョ][うウ]?)*|[くぐすずつづぬふぶぷむゆるゔクグスズツヅヌフブプムユルヴ][うウ]*|[けげせぜねへべぺめれゑケゲセゼネヘベペメレヱヹ][いイ]*|[こごそぞとどのほぼぽもよろをコゴソゾトドノホボポモヨロヲヺ][うウ]*)[ぁぃぅぇぉっァィゥェォッーんン]*|\\p{sc=Han}|[\\p{sc=Latin}\\p{sc=Cyrillic}\\p{sc=Greek}\\p{Nd}]+)";
const beginPattern = new RegExp(pattern, "u");
const countPattern = new RegExp(pattern, "gu");

export const populateDots = (lines: LyricsLine[]) =>
  lines.map((line) => {
    if (!line.content) return [0];
    let ptr = 0;
    const dots = Array(line.content.length + 1).fill(0);
    const furiganaMapping =
      line.attachments?.content?.[FURIGANA]?.attachment.reduce<
        Record<number, RangeAttributeLabel>
      >((prev, curr) => {
        prev[curr.range[0]] = curr;
        return prev;
      }, {}) ?? {};
    while (ptr < line.content.length) {
      const furigana = furiganaMapping[ptr];
      if (furigana) {
        // fill dots with furigana
        const kana = furigana.content;
        const count = kana.match(countPattern)?.length ?? 0;
        const span = furigana.range[1] - furigana.range[0];
        if (span > 1 && count % span === 0) {
          for (let i = 0; i < span; i++) {
            dots[ptr + i] = Math.floor(count / span);
          }
        } else {
          dots[ptr] = count;
        }
        ptr = furigana.range[1];
      } else {
        // fill dots for normal text
        const match = line.content.slice(ptr).match(beginPattern);
        if (match?.index === 0) {
          dots[ptr] = 1;
          ptr += match[0].length;
        } else if (match?.index) {
          ptr += match.index;
        } else {
          break;
        }
      }
    }
    dots[ptr] = -1;
    return dots;
  });
