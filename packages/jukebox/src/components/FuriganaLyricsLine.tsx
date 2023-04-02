import { LyricsLine, FURIGANA } from "lyrics-kit/core";
import { LyricsKitLyricsLine } from "../graphql/LyricsKitObjects";

interface Props {
  lyricsKitLine?: LyricsLine;
  graphQLSourceLine?: LyricsKitLyricsLine;
  transliterationLine?: [string, string][];
}

export default function FuriganaLyricsLine({
  lyricsKitLine,
  graphQLSourceLine,
  transliterationLine,
}: Props) {
  if (lyricsKitLine || graphQLSourceLine) {
    const groupings: (string | [string, string])[] = [];
    let ptr = 0;
    if (lyricsKitLine) {
      const base = lyricsKitLine.content;
      const furigana =
        lyricsKitLine?.attachments?.content?.[FURIGANA]?.attachment ?? [];
      furigana.forEach(({ content, range: [start, end] }) => {
        if (start > ptr) {
          groupings.push(base.substring(ptr, start));
        }
        groupings.push([base.substring(start, end), content]);
        ptr = end;
      });
      if (ptr < base.length) groupings.push(base.substring(ptr));
    } else {
      const base = graphQLSourceLine.content;
      const furigana = graphQLSourceLine.attachments.furigana ?? [];
      furigana.forEach(({ content, leftIndex: start, rightIndex: end }) => {
        if (start > ptr) {
          groupings.push(base.substring(ptr, start));
        }
        groupings.push([base.substring(start, end), content]);
        ptr = end;
      });
      if (ptr < base.length) groupings.push(base.substring(ptr));
    }
    return (
      <>
        {groupings.map((v, k) => {
          if (typeof v === "string") {
            return <span key={k}>{v}</span>;
          } else {
            return (
              <ruby key={k}>
                {v[0]}
                <rp>(</rp>
                <rt>{v[1]}</rt>
                <rp>)</rp>
              </ruby>
            );
          }
        })}
      </>
    );
  }
  if (transliterationLine) {
    return (
      <>
        {transliterationLine.map(([text, ruby], k) => {
          if (text === ruby) {
            return <span key={k}>{text}</span>;
          } else {
            return (
              <ruby key={k}>
                {text}
                <rp>(</rp>
                <rt>{ruby}</rt>
                <rp>)</rp>
              </ruby>
            );
          }
        })}
      </>
    );
  }
  return <></>;
}
