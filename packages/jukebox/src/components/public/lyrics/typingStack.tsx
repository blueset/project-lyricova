import type { LyricsKitLyrics } from "@lyricova/components/gql/schema";
import { useAppContext } from "../AppContext";
import type React from "react";
import { useRef } from "react";
import { usePlayerLyricsTypingState } from "../../../hooks/usePlayerLyricsTypingState";

interface Props {
  lyrics: LyricsKitLyrics;
}

export function TypingStackedLyrics({ lyrics }: Props) {
  const { playerRef } = useAppContext();
  const doneRef = useRef<HTMLElement>(null);
  const typingRef = useRef<HTMLElement>(null);

  const { sequenceQuery, currentFrameId } = usePlayerLyricsTypingState(
    lyrics,
    playerRef,
    0.75,
    doneRef,
    typingRef,
  );

  let statusNode: React.ReactNode = null;
  if (sequenceQuery.loading) statusNode = <span>loading</span>;
  else if (sequenceQuery.error)
    statusNode = <span>Error: {JSON.stringify(sequenceQuery.error)}</span>;
  else if (!sequenceQuery.data) {
    statusNode = (
      <span>
        {lyrics.lines.length} lines, starting at{" "}
        {lyrics.lines[0]?.position ?? 0} second.
      </span>
    );
  }

  return (
    <div
      className="size-full overflow-hidden flex justify-start flex-col px-8 mask-b-from-[calc(100%_-_40px)] mask-b-to-100%"
      lang="ja"
    >
      {statusNode}
      <div className="text-5xl font-semibold mb-2" hidden={!sequenceQuery.data}>
        <span ref={doneRef} />
        <span ref={typingRef} className="bg-white/50" />
      </div>
      {sequenceQuery.dataState === "complete" &&
        sequenceQuery.data.transliterate.typingSequence
          .map((v, idx) => {
            if (idx >= currentFrameId || idx < currentFrameId - 30) return null;
            return (
              <div className="text-3xl opacity-70 mb-2" key={idx}>
                {v
                  .map((vv) =>
                    vv.sequence.length > 0
                      ? vv.sequence[vv.sequence.length - 1]
                      : "",
                  )
                  .join("")}
              </div>
            );
          })
          .reverse()}
    </div>
  );
}
