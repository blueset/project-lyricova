import type { LyricsKitLyrics } from "../../../graphql/LyricsKitObjects";
import { useAppContext } from "../AppContext";
import { useLyricsState } from "../../../frontendUtils/hooks";
import { Box } from "@mui/material";
import { gql, useQuery } from "@apollo/client";
import type { DocumentNode } from "graphql";
import type { CSSProperties } from "react";

const SEQUENCE_QUERY = gql`
  query TypingSequence($text: String!) {
    transliterate(text: $text) {
      text
      karaoke
    }
  }
` as DocumentNode;

interface SequenceQueryResult {
  transliterate: {
    text: string;
    karaoke: [string, string][][];
  };
}

interface Props {
  lyrics: LyricsKitLyrics;
  blur?: boolean;
}

export function PlainFuriganaLyrics({ lyrics }: Props) {
  const { playerRef } = useAppContext();
  const line = useLyricsState(playerRef, lyrics);

  const sequenceQuery = useQuery<SequenceQueryResult>(SEQUENCE_QUERY, {
    variables: {
      text: lyrics.lines.map((v) => v.content).join("\n"),
    },
  });

  let node = <span>...</span>;
  if (sequenceQuery.loading) node = <span>loading</span>;
  else if (sequenceQuery.error)
    node = <span>Error: {JSON.stringify(sequenceQuery.error)}</span>;
  else {
    const seq = sequenceQuery.data.transliterate.karaoke[line];
    if (seq) {
      node = (
        <Box
          lang="ja"
          sx={{
            fontWeight: 700,
            fontSize: "2.5em",
            fontFamily: "serif",
            "@supports (-moz-appearance: none)": {
              "& rt": {
                transform: "translateY(0.5em)",
              },
            }
          }}
        >
          {seq.map(([text, ruby], k) => {
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
        </Box>
      );
    }
  }

  return (
    <Box
      style={
        ({
          padding: 4,
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        } as unknown) as CSSProperties
      }
    >
      {node}
    </Box>
  );
}
