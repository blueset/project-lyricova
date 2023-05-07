import type { LyricsKitLyrics } from "../../../graphql/LyricsKitObjects";
import { useAppContext } from "../AppContext";
import { Box } from "@mui/material";
import type { CSSProperties } from "react";
import { useRef } from "react";
import { usePlayerLyricsTypingState } from "../../../frontendUtils/hooks";

interface Props {
  lyrics: LyricsKitLyrics;
}

export function TypingStackedLyrics({ lyrics }: Props) {
  const { playerRef } = useAppContext();
  const doneRef = useRef<HTMLSpanElement>();
  const typingRef = useRef<HTMLSpanElement>();

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
      <div style={{ fontSize: "3em", fontWeight: 600, marginBottom: "0.5rem" }}>
        <span ref={doneRef} />
        <span ref={typingRef} style={{ backgroundColor: "#ffffff80" }} />
      </div>
    );
  }

  return (
    <Box
      sx={
        {
          width: "100%",
          height: "100%",
          overflow: "hidden",
          display: "flex",
          justifyContent: "start",
          flexDirection: "column",
          maskBorderImageSource:
            "linear-gradient(90deg, rgba(0,0,0,0) 0% , rgba(0,0,0,1) 49%, rgba(0,0,0,1) 51%, rgba(0,0,0,0) 100%)",
          maskBorderImageSlice: "0 49% fill",
          maskBorderImageWidth: "0 40px",
          maskBoxImageSource:
            "linear-gradient(90deg, rgba(0,0,0,0) 0% , rgba(0,0,0,1) 49%, rgba(0,0,0,1) 51%, rgba(0,0,0,0) 100%)",
          maskBoxImageSlice: "0 49% fill",
          maskBoxImageWidth: "0 40px",
          padding: "0 2rem",
          "-webkit-mask-box-image-source":
            "linear-gradient(180deg, rgba(0,0,0,0) 0% , rgba(0,0,0,1) 49%, rgba(0,0,0,1) 51%, rgba(0,0,0,0) 100%)",
          "-webkit-mask-box-image-slice": "49% 0 fill",
          "-webkit-mask-box-image-width": "0 0 40px",
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
              <Box
                sx={{
                  fontSize: "2em",
                  opacity: 0.7,
                  marginBottom: "0.5rem",
                }}
                key={idx}
              >
                {v
                  .map((vv) =>
                    vv.sequence.length > 0
                      ? vv.sequence[vv.sequence.length - 1]
                      : ""
                  )
                  .join("")}
              </Box>
            );
          })
          .reverse()}
    </Box>
  );
}
