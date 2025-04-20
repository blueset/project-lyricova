import type { LyricsKitLyrics } from "@lyricova/api/graphql/types";
import { useAppContext } from "../AppContext";
import { useRef } from "react";
import { usePlayerLyricsTypingState } from "../../../hooks/usePlayerLyricsTypingState";

interface Props {
  lyrics: LyricsKitLyrics;
  blur?: boolean;
}

export function TypingFocusedLyrics({ lyrics }: Props) {
  const { playerRef } = useAppContext();
  const doneRef = useRef<HTMLSpanElement>(null);
  const typingRef = useRef<HTMLSpanElement>(null);

  const { sequenceQuery } = usePlayerLyricsTypingState(
    lyrics,
    playerRef,
    0.75,
    doneRef,
    typingRef
  );

  let node = (
    <span>
      {lyrics.lines.length} lines, starting at {lyrics.lines[0].position}{" "}
      second.
    </span>
  );
  if (sequenceQuery.loading) node = <span>loading</span>;
  else if (sequenceQuery.error)
    node = <span>Error: {JSON.stringify(sequenceQuery.error)}</span>;
  else if (sequenceQuery.data) {
    node = (
      <div className="text-7xl font-semibold">
        <span ref={doneRef} />
        <span ref={typingRef} className="text-foreground/50" />
      </div>
    );
  }

  return (
    <div className="p-8 size-full flex flex-col justify-center" lang="ja">
      {node}
    </div>
  );
}
