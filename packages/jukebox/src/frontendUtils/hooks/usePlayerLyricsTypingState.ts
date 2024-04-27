import { gql, QueryResult, useQuery } from "@apollo/client";
import _ from "lodash";
import { RefObject, useMemo } from "react";
import { useTrackwiseTimelineControl } from "./useTrackwiseTimelineControl";
import { LyricsKitLyricsLine, LyricsKitLyrics } from "../../graphql/LyricsKitObjects";
import { AnimatedWord } from "../../graphql/TransliterationResolver";
import { PlayerLyricsState } from "./types";
import { usePlainPlayerLyricsState } from "./usePlainPlayerLyricsState";

type Timeline = gsap.core.Timeline;

const SEQUENCE_QUERY = gql`
  query TypingSequence($text: String!, $furigana: [[FuriganaLabel!]!]! = []) {
    transliterate(text: $text, furigana: $furigana) {
      text
      typingSequence {
        convert
        sequence
      }
    }
  }
`;

export interface SequenceQueryResult {
  transliterate: {
    text: string;
    typingSequence: AnimatedWord[][];
  };
}

/** Maximum time in second for one key stroke to take in the typing animation */
const LONGEST_STEP_SECONDS = 1;

interface PlayerLyricsTypingState
  extends PlayerLyricsState<LyricsKitLyricsLine> {
  sequenceQuery: QueryResult<SequenceQueryResult>;
  timeline: Timeline;
}

/**
 * State hook for typing lyrics animation
 * @param lyrics
 * @param playerRef
 * @param perLineThreshold Percentage of time for the animation to take per line of lyrics, (0, 1]
 * @param doneElementRef
 * @param typingElementRef
 */
export function usePlayerLyricsTypingState(
  lyrics: LyricsKitLyrics,
  playerRef: RefObject<HTMLAudioElement>,
  perLineThreshold: number,
  doneElementRef: RefObject<HTMLElement>,
  typingElementRef: RefObject<HTMLElement>
): PlayerLyricsTypingState {
  const state = usePlainPlayerLyricsState(lyrics, playerRef);
  const { playerState, startTimes, endTimes } = state;

  const sequenceQuery = useQuery<SequenceQueryResult>(SEQUENCE_QUERY, {
    variables: {
      text: useMemo(
        () => lyrics.lines.map((v) => v.content).join("\n"),
        [lyrics.lines]
      ),
      furigana: lyrics.lines.map(
        (v) =>
          v.attachments?.furigana?.map(
            ({ content, leftIndex, rightIndex }) => ({
              content,
              leftIndex,
              rightIndex,
            })
          ) ?? []
      ),
    },
  });

  const timeline = useMemo<Timeline>(() => {
    if (!sequenceQuery.data) return null;
    gsap.registerPlugin(TextPlugin);
    if (!doneElementRef.current || !typingElementRef.current) return null;
    const tl = gsap.timeline();
    sequenceQuery.data.transliterate.typingSequence.forEach((v, idx) => {
      const start = startTimes[idx],
        lineEnd = endTimes[idx + 1];
      if (start === undefined || lineEnd === undefined) return;
      const duration = Math.min(
        (lineEnd - start) * perLineThreshold,
        v.length * LONGEST_STEP_SECONDS
      );

      const stepDuration =
        duration / Math.max(1, _.sum(v.map((w) => w.sequence.length)));
      let typed = "",
        i = 0;
      for (const word of v) {
        if (word.convert) {
          for (const step of word.sequence) {
            tl.set(
              doneElementRef.current,
              { text: typed },
              start + i * stepDuration
            );
            tl.set(
              typingElementRef.current,
              { text: step },
              start + i * stepDuration
            );
            i++;
          }
        } else {
          for (const step of word.sequence) {
            tl.set(
              doneElementRef.current,
              { text: typed + step },
              start + i * stepDuration
            );
            tl.set(
              typingElementRef.current,
              { text: "" },
              start + i * stepDuration
            );
            i++;
          }
        }
        typed += word.sequence[word.sequence.length - 1];
      }
      tl.set(doneElementRef.current, { text: typed }, start + duration);
      tl.set(typingElementRef.current, { text: "" }, start + duration);
    });

    return tl;
    // Keeping doneElementRef.current and typingElementRef.current to ensure the timeline is updated accordingly
  }, [
    endTimes,
    perLineThreshold,
    sequenceQuery.data,
    startTimes,
    doneElementRef.current,
    typingElementRef.current,
  ]);

  useTrackwiseTimelineControl(playerState, timeline);

  return { ...state, timeline, sequenceQuery };
}
