import { ApolloClient, gql } from "@apollo/client";
import { kanaToHira, romaToHira } from "lyricova-common/utils/kanaUtils";
import { FURIGANA, LyricsLine } from "lyrics-kit/core";
import { VocaDBLyricsEntry } from "../../../../graphql/LyricsProvidersResolver";
import diff from "fast-diff";

const VOCADB_LYRICS_QUERY = gql`
  query ($id: Int!) {
    vocaDBLyrics(id: $id) {
      id
      translationType
      cultureCodes
      source
      url
      value
    }
  }
`;

export async function furiganaRomajiMatching({
  apolloClient,
  lines,
  songId,
}: {
  apolloClient: ApolloClient<object>;
  lines: LyricsLine[];
  songId: number;
}): Promise<[number, string][][]> {
  const kanaLines = lines.map((line) => {
    const kanaLine: string[] = [];
    let ptr = 0;
    const base = line.content;
    const furigana = line?.attachments?.content?.[FURIGANA]?.attachment ?? [];
    furigana.forEach(({ content, range: [start, end] }) => {
      if (start > ptr) {
        kanaLine.push(base.substring(ptr, start));
      }
      kanaLine.push(content);
      ptr = end;
    });
    if (ptr < base.length) kanaLine.push(base.substring(ptr));

    return kanaToHira(kanaLine.join("").trimEnd());
  });

  console.log("kanaLines", kanaLines);

  const vocaDBLyrics = await apolloClient.query<{
    vocaDBLyrics: VocaDBLyricsEntry[];
  }>({
    query: VOCADB_LYRICS_QUERY,
    variables: { id: songId },
  });
  const romajiLines =
    vocaDBLyrics.data.vocaDBLyrics
      .find((v) => v.translationType === "Romanized")
      ?.value?.split("\n") ?? [];

  if (!romajiLines.length) {
    return [];
  }
  const romajiHiraLines = romajiLines.map((line) => romaToHira(line));

  console.log("kanaLines.join", kanaLines.join("\n"));
  const diffs: [number, string][] = diff(
    kanaLines.join("\n"),
    romajiHiraLines.join("").replaceAll(" ", "")
  ).reduce<[number, string][]>((acc, [type, text], idx) => {
    acc.push([type, text]);
    if (
      type === 1 &&
      acc.length > 1 &&
      acc[acc.length - 2][0] === -1 &&
      acc[acc.length - 2][1].includes("\n")
    ) {
      const lastMinusOne = acc[acc.length - 2][1];
      acc.pop();
      acc.pop();
      const minusOneLeft = lastMinusOne.slice(0, lastMinusOne.indexOf("\n"));
      const minusOneRight = lastMinusOne.slice(lastMinusOne.indexOf("\n") + 1);
      acc.push([-1, minusOneLeft]);
      acc.push([1, text]);
      acc.push([-1, "\n" + minusOneRight]);
    }
    return acc;
  }, []);

  console.log("diffs", diffs);

  let diffLines: [number, string][][] = [[]];
  diffs.forEach(([type, text], idx) => {
    if (type === 0) {
      diffLines[diffLines.length - 1].push([type, text]);
    } else if (type === -1) {
      text.split("\n").forEach((subtext, subTextIdx) => {
        if (subTextIdx > 0) {
          diffLines.push([]);
        }
        if (subtext) diffLines[diffLines.length - 1].push([type, subtext]);
      });
    } else if (type === 1) {
      const lastLine = diffLines[diffLines.length - 1];
      lastLine.push([type, text]);
      // Diff merger rules
      if (lastLine.length > 1 && lastLine[lastLine.length - 2][0] === -1) {
        const beforeDiff = lastLine[lastLine.length - 3]?.[1] ?? "";
        const lastMinusOne = lastLine[lastLine.length - 2][1];
        const lastPlusOne = lastLine[lastLine.length - 1][1];
        const merged = mergeDiff(beforeDiff, lastMinusOne, lastPlusOne);
        lastLine.splice(lastLine.length - 2, 2, ...merged);
      }
    }
  });
  console.log(diffLines);
  diffLines = diffLines.map((line) =>
    line.reduce<[number, string][]>((acc, [type, text]) => {
      if (acc.length === 0 || acc[acc.length - 1][0] !== type) {
        acc.push([type, text]);
      } else {
        acc[acc.length - 1][1] += text;
      }
      return acc;
    }, [])
  );

  return diffLines;
}

const oneCharMapping = {
  は: "わ",
  を: "お",
  へ: "え",
  づ: "ず",
  ぁ: "あ",
  ぃ: "い",
  ぅ: "う",
  ぇ: "え",
  ぉ: "お",
};

const vowelMapping = {
  あ: /[あかがさざただなはばぱまやゃらわ]$/g,
  い: /[いきぎしじちぢにひびぴみり]$/g,
  う: /[うくぐすずつづぬふぶぷゆむ]$/g,
  え: /[えけげせぜてでねへべぺめれ]$/g,
  お: /[おこごそぞとどのほぼぽもよょろを]$/g,
};

function mergeDiff(
  beforeDiff: string,
  lastMinusOne: string,
  lastPlusOne: string
): [number, string][] {
  let merged = "";
  let changed = true;
  while (changed) {
    changed = false;
    for (const [minusOne, plusOne] of Object.entries(oneCharMapping)) {
      if (
        lastMinusOne.startsWith(minusOne) &&
        lastPlusOne.startsWith(plusOne)
      ) {
        merged += minusOne;
        lastMinusOne = lastMinusOne.slice(1);
        lastPlusOne = lastPlusOne.slice(1);
        changed = true;
      }
    }
    if (!changed) {
      if (lastMinusOne.startsWith("ー")) {
        for (const [vowel, regex] of Object.entries(vowelMapping)) {
          if (
            (beforeDiff + merged).match(regex) &&
            lastPlusOne.startsWith(vowel)
          ) {
            merged += "ー";
            lastMinusOne = lastMinusOne.slice(1);
            lastPlusOne = lastPlusOne.slice(1);
            changed = true;
          }
        }
      }
    }
  }
  const result: [number, string][] = [];
  if (merged) result.push([0, merged]);
  if (lastMinusOne) result.push([-1, lastMinusOne]);
  if (lastPlusOne) result.push([1, lastPlusOne]);
  return result;
}
