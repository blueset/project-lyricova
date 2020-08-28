import { LyricsKitLyrics } from "../../../graphql/LyricsKitObjects";
import { useAppContext } from "../AppContext";
import { useLyricsState } from "../../../frontendUtils/hooks";
import { makeStyles } from "@material-ui/core";
import _ from "lodash";
import { gql, useQuery } from "@apollo/client";

const SEQUENCE_QUERY = gql`
  query TypingSequence($text: String!) {
    transliterate(text: $text) {
      text
      karaoke
    }
  }
`;

interface SequenceQueryResult {
  transliterate: {
    text: string;
    karaoke: [string, string][][];
  };
}

const ANIMATION_THRESHOLD = 0.25;

const useStyle = makeStyles((theme) => {
  return {
    container: {
      padding: theme.spacing(4),
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
    },
    text: {
      fontWeight: 700,
      fontSize: "2.5em",
      fontFamily: "serif",
      "& rt": {
        transform: "translateY(0.5em)",
      },
    },
    blurredBrighter: {
      filter: "var(--jukebox-cover-filter-brighter)",
    },
    brighter: {
      filter: "var(--jukebox-cover-filter-brighter-blurless)",
    }
  };
});

interface Props {
  lyrics: LyricsKitLyrics;
  blur?: boolean;
}

export function PlainFuriganaLyrics({ lyrics }: Props) {
  const { playerRef } = useAppContext();
  const line = useLyricsState(playerRef, lyrics);

  const styles = useStyle();

  const sequenceQuery = useQuery<SequenceQueryResult>(
    SEQUENCE_QUERY,
    {
      variables: {
        text: lyrics.lines.map((v) => v.content).join("\n")
      },
    }
  );

  let node = <span>...</span>;
  if (sequenceQuery.loading) node = <span>loading</span>;
  else if (sequenceQuery.error) node = <span>Error: {JSON.stringify(sequenceQuery.error)}</span>;
  else {
    const seq = sequenceQuery.data.transliterate.karaoke[line];
    if (seq) {
      node = <div lang="ja" className={styles.text}>
        {seq.map(([text, ruby], k) => {
          if (text === ruby) {
            return <span key={k}>{text}</span>;
          } else {
            return <ruby key={k}>
              {text}<rp>(</rp><rt>{ruby}</rt><rp>)</rp>
            </ruby>;
          }
        })}
      </div>;
    }
  }

  return (
    <div className={styles.container}>
      {node}
    </div>
  );
}