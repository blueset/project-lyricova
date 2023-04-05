import type { LyricsKitLyrics } from "../../../graphql/LyricsKitObjects";
import { useAppContext } from "../AppContext";
import { Box } from "@mui/material";
import { useRef } from "react";
import { usePlayerLyricsTypingState } from "../../../frontendUtils/hooks";

interface Props {
  lyrics: LyricsKitLyrics;
  blur?: boolean;
}

export function TypingFocusedLyrics({ lyrics }: Props) {
  const { playerRef } = useAppContext();
  const doneRef = useRef<HTMLSpanElement>();
  const typingRef = useRef<HTMLSpanElement>();

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
      <div style={{ fontSize: "4em", fontWeight: 600 }}>
        <span ref={doneRef} />
        <span ref={typingRef} style={{ color: "#ffffff80" }} />
      </div>
    );
  }

  return (
    <Box
      sx={{
        padding: 4,
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      {node}
    </Box>
  );
}
