import { LyricsKitLyrics } from "../../../graphql/LyricsKitObjects";
import { useAppContext } from "../AppContext";
import { makeStyles } from "@material-ui/core";
import _ from "lodash";
import { AnimatedWord } from "../../../utils/typingSequence";
import { useMemo } from "react";
import { useLyricsSegmentState } from "../../../frontendUtils/hooks";
import clsx from "clsx";

const useStyle = makeStyles((theme) => {
  return {
    container: {
      padding: theme.spacing(4),
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column-reverse",
    },
    line: {
      fontSize: "3em",
      fontWeight: 600,
      "& .typing": {
        backgroundColor: theme.palette.primary.light + "80",
      },
      "& .cursor": {
        backgroundColor: "white",
        display: "inline-block",
        width: "2px",
        height: "1.2em",
        verticalAlign: "text-top",
        animation: "$blink 0.5s infinite alternate",
      }
    },
    pastLine: {
      fontSize: "2em",
      // fontWeight: 600,
      opacity: 0.7,
      marginBottom: "0.5em",
    },
    "@keyframes blink": {
      from: { background: "#fff0", },
      to: { background: "#ffff", },
    }
  };
});

interface TypingLineProps {
  sequence: AnimatedWord[];
  currentStep: number;
  className?: string;
}


function TypingLine({ sequence, currentStep, className }: TypingLineProps) {

  const segments = useMemo(() =>
    sequence
      .map((word, idx) => word.sequence.map((v, vidx) => [idx, vidx] as [number, number]))
      .reduce<[number, number][]>((prev, curr) => prev.concat(curr), []),
    [sequence]
  );

  if (!segments[currentStep]) {
    // render full line.
    return <div className={className}>
      {sequence.map((word, idx) =>
        <span className="word" key={idx}>
          {word.sequence.length > 0 ? word.sequence[word.sequence.length - 1] : ""}
        </span>
      )}
      <span className="cursor" />
    </div>;
  } else {
    // render animation
    const [curWord, curStep] = segments[currentStep];

    return <div className={className}>
      {sequence.map((word, idx) => {
        if (idx < curWord) {
          return <span className="word" key={idx}>
            {word.sequence.length > 0 ? word.sequence[word.sequence.length - 1] : ""}
          </span>;
        } else if (idx === curWord) {
          return <span className={clsx("word", word.convert && "typing")} key={idx}>
            {word.sequence[curStep]}
          </span>;
        }
      })}
      <span className="cursor" />
    </div>;
  }
}

interface Props {
  lyrics: LyricsKitLyrics;
  blur?: boolean;
}

export function TypingStackedLyrics({ lyrics }: Props) {
  const { playerRef } = useAppContext();

  const { line, currentStep, sequenceQuery } = useLyricsSegmentState(playerRef, lyrics, 0.75);

  const styles = useStyle();

  let node = <span>{lyrics.lines.length} lines, starting at {lyrics.lines[0].position} second.</span>;
  if (sequenceQuery.loading) node = <span>loading</span>;
  else if (sequenceQuery.error) node = <span>Error: {JSON.stringify(sequenceQuery.error)}</span>;
  else {
    const seq = line !== null && sequenceQuery.data.transliterate.typingSequence[line];

    if (seq) {
      node = <TypingLine sequence={seq} currentStep={currentStep} className={styles.line} />;
    }
  }

  return (
    <div className={styles.container}>
      {node}
      {sequenceQuery.data && sequenceQuery.data.transliterate.typingSequence.map((v, idx) => {
        if (idx >= line || idx < line - 15) return null;
        return (
          <div className={styles.pastLine} key={idx}>
            {v.map((vv) => vv.sequence.length > 0 ? vv.sequence[vv.sequence.length - 1] : "").join("")}
          </div>
        );
      }).reverse()}
    </div>
  );
}