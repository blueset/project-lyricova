import { LyricsKitLyrics, LyricsKitLyricsLine } from "../../../graphql/LyricsKitObjects";
import { useAppContext } from "../AppContext";
import { useLyricsState } from "../../../frontendUtils/hooks";
import { makeStyles } from "@material-ui/core";
import { motion, Transition } from "framer-motion";
import BalancedText from "react-balance-text-cj";
import _ from "lodash";
import clsx from "clsx";
import { gql, useQuery } from "@apollo/client";
import { AnimatedWord } from "../../../utils/typingSequence";

const SEQUENCE_QUERY = gql`
  query TypingSequence($texts: [String!]!) {
    batchTransliterate(texts: $texts) {
      text
      typingSequence {
        convert
        sequence
      }
    }
  }
`;

interface SequenceQueryResult {
  batchTransliterate: {
    text: string;
    typingSequence: AnimatedWord[];
  }[];
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
      // justifyContent: "center",
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

export function PlainTypingLyrics({ lyrics }: Props) {
  const { playerRef } = useAppContext();
  const line = useLyricsState(playerRef, lyrics);

  const styles = useStyle();

  const sequenceQuery = useQuery<SequenceQueryResult>(
    SEQUENCE_QUERY,
    {
      variables: {
        texts: lyrics.lines.map((v) => v.content)
      },
    }
  );

  let node = <span>...</span>;
  if (sequenceQuery.loading) node = <span>loading</span>;
  else if (sequenceQuery.error) node = <span>Error: {JSON.stringify(sequenceQuery.error)}</span>;
  else {
    const seq = sequenceQuery.data.batchTransliterate[line];
    if (seq) {
      node = <div>
        <div>{seq.text}</div>
        <ol>
          {seq.typingSequence.map((v, k) => <li key={k}>{v.convert ? "Convert" : "Plain"}
            <ol>{v.sequence.map((vs, ks) => <li key={`${k}-${ks}`}>{vs}</li>)}</ol>
          </li>)}
        </ol>
      </div>;
    }
  };

  return (
    <div className={styles.container}>
      {node}
    </div>
  );
}