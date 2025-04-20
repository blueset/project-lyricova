import type { LyricsKitLyrics } from "@lyricova/api/graphql/types";
import { useAppContext } from "../AppContext";
import type { CSSProperties } from "react";
import { useRef } from "react";
import { usePlayerLyricsTypingState } from "../../../hooks/usePlayerLyricsTypingState";

interface Props {
  lyrics: LyricsKitLyrics;
}

export function TypingStackedLyrics({ lyrics }: Props) {
  const { playerRef } = useAppContext();
  const doneRef = useRef<HTMLSpanElement>(null);
  const typingRef = useRef<HTMLSpanElement>(null);

  const { sequenceQuery, currentFrameId } = usePlayerLyricsTypingState(
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
      <div className="text-5xl font-semibold mb-2">
        <span ref={doneRef} />
        <span ref={typingRef} className="bg-white/50" />
      </div>
    );
  }

  return (
    <div
      className="size-full overflow-hidden flex justify-start flex-col px-8"
      style={
        {
          maskBorderImageSource:
            "linear-gradient(90deg, rgba(0,0,0,0) 0% , rgba(0,0,0,1) 49%, rgba(0,0,0,1) 51%, rgba(0,0,0,0) 100%)",
          maskBorderImageSlice: "0 49% fill",
          maskBorderImageWidth: "0 40px",
          maskBoxImageSource:
            "linear-gradient(90deg, rgba(0,0,0,0) 0% , rgba(0,0,0,1) 49%, rgba(0,0,0,1) 51%, rgba(0,0,0,0) 100%)",
          maskBoxImageSlice: "0 49% fill",
          maskBoxImageWidth: "0 40px",
          WebkitMaskBoxImageSource:
            "linear-gradient(180deg, rgba(0,0,0,0) 0% , rgba(0,0,0,1) 49%, rgba(0,0,0,1) 51%, rgba(0,0,0,0) 100%)",
          WebkitMaskBoxImageSlice: "49% 0 fill",
          WebkitMaskBoxImageWidth: "0 0 40px",
        } as unknown as CSSProperties
      }
      lang="ja"
    >
      {node}
      {sequenceQuery.data &&
        sequenceQuery.data.transliterate.typingSequence
          .map((v, idx) => {
            if (idx >= currentFrameId || idx < currentFrameId - 30) return null;
            return (
              <div className="text-3xl opacity-70 mb-2" key={idx}>
                {v
                  .map((vv) =>
                    vv.sequence.length > 0
                      ? vv.sequence[vv.sequence.length - 1]
                      : ""
                  )
                  .join("")}
              </div>
            );
          })
          .reverse()}
    </div>
  );
}
