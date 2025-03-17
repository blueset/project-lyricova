import { Theme } from "@mui/material";
import { CSSProperties } from "react";

function matchContexualFurigana(
  base: string,
  ruby: string,
  groupings: (string | [string, string])[],
  matchGroups: [string, string][]
) {
  if (matchGroups.length < 1) return false;
  const currentMatchingIndex = matchGroups.findIndex(
    (v) => base === v[0] && ruby === v[1]
  );
  if (currentMatchingIndex >= 0) {
    const matchingGroupIndex = groupings.findIndex(
      (v) =>
        typeof v !== "string" &&
        v[0] === matchGroups[0][0] &&
        v[1] === matchGroups[0][1]
    );
    if (
      matchingGroupIndex >= 0 &&
      matchingGroupIndex < groupings.length - matchGroups.length + 1 &&
      groupings.every(
        (v, i) =>
          i < matchingGroupIndex ||
          i >= matchingGroupIndex + matchGroups.length ||
          (typeof v !== "string" &&
            v[0] === matchGroups[i - matchingGroupIndex][0] &&
            v[1] === matchGroups[i - matchingGroupIndex][1])
      )
    )
      return true;
  }
  return false;
}

export function furiganaHighlight(
  theme: Theme
): (
  base: string,
  ruby: string,
  groupings: (string | [string, string])[]
) => CSSProperties | undefined {
  const primaryText = { color: theme.palette.primary.light };
  const secondaryText = { color: theme.palette.secondary.light };
  return (base, ruby, groupings) => {
    if (
      (base === "明日" && (ruby === "あした" || ruby === "あす")) ||
      (base === "抱" && (ruby === "だ" || ruby === "いだ")) ||
      (base === "行" && (ruby === "い" || ruby === "ゆ")) ||
      (base === "寂" && (ruby === "さび" || ruby === "さみ")) ||
      (base === "描" && (ruby === "か" || ruby === "えが")) ||
      (base === "詩" && (ruby === "し" || ruby === "うた")) ||
      (base === "何" && (ruby === "なに" || ruby === "なん")) ||
      (base === "触" && (ruby === "ふ" || ruby === "さわ")) ||
      (base === "風" && (ruby === "かぜ" || ruby === "ふう")) ||
      (base === "傍" && (ruby === "はた" || ruby === "そば")) ||
      (base === "方" && (ruby === "ほう" || ruby === "かた")) ||
      (base === "止" && (ruby === "と" || ruby === "や")) ||
      (base === "間" && (ruby === "あいだ" || ruby === "ま")) ||
      (base === "被" && (ruby === "かぶ" || ruby === "こうむ")) ||
      (base === "開" && (ruby === "ひら" || ruby === "あ")) ||
      (base === "埋" && (ruby === "う" || ruby === "うず")) ||
      (base === "後" &&
        (ruby === "あと" || ruby === "のち" || ruby === "ご")) ||
      (base === "金" && ruby === "きん") ||
      (base === "後" && ruby === "ご") ||
      (base === "誘" && ruby === "さそ")
    )
      return secondaryText;
    if (
      (base === "今" && ruby === "こん") ||
      (base === "君" && ruby === "くん") ||
      (base === "歪" && ruby === "いが") ||
      (base === "良" && ruby === "よ") ||
      (base === "罰" && ruby === "ばち") ||
      (base === "後" && ruby === "のち") ||
      (base === "終" && ruby === "おわり") ||
      (base === "側" && ruby === "がわ")
    )
      return primaryText;

    // contextual
    if (
      matchContexualFurigana(base, ruby, groupings, [
        ["身", "しん"],
        ["体", "たい"],
      ]) ||
      matchContexualFurigana(base, ruby, groupings, [
        ["千", "ち"],
        ["年", "とせ"],
      ]) ||
      matchContexualFurigana(base, ruby, groupings, [
        ["宝", "ほう"],
        ["物", "もつ"],
      ]) ||
      matchContexualFurigana(base, ruby, groupings, [
        ["一", "いち"],
        ["歩", "ほ"],
      ]) ||
      matchContexualFurigana(base, ruby, groupings, [
        ["正", "まさ"],
        ["義", "よし"],
      ]) ||
      matchContexualFurigana(base, ruby, groupings, [
        ["一", "かず"],
        ["人", "と"],
      ])
    ) {
      return primaryText;
    }
    return undefined;
  };
}