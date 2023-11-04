import type { LyricsLine } from "lyrics-kit/core";
import { FURIGANA } from "lyrics-kit/core";
import type { LyricsKitLyricsLine } from "../graphql/LyricsKitObjects";
import { CSSProperties } from "react";

interface Props {
  lyricsKitLine?: LyricsLine;
  graphQLSourceLine?: LyricsKitLyricsLine;
  transliterationLine?: [string, string][];
  rubyStyles?: (
    base: string,
    ruby: string,
    groupings: (string | [string, string])[]
  ) => CSSProperties | undefined;
}

export default function FuriganaLyricsLine({
  lyricsKitLine,
  graphQLSourceLine,
  transliterationLine,
  rubyStyles,
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
              <ruby key={k} style={rubyStyles?.(v[0], v[1], groupings)}>
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
