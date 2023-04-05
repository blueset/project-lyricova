import type { LyricsKitLyrics } from "../../../graphql/LyricsKitObjects";
import { useAppContext } from "../AppContext";
import { useLyricsState } from "../../../frontendUtils/hooks";
import { Box, styled } from "@mui/material";
import type { CSSProperties } from "react";
import { useRef, useEffect } from "react";
import clsx from "clsx";

const ANIMATION_THRESHOLD = 0.25;

interface Props {
  lyrics: LyricsKitLyrics;
}

const StyledLine = styled("span")({
  fontWeight: 400,
  fontSize: "2.5em",
  opacity: 0.5,
  marginBottom: 4,
  "&.active": {
    opacity: 1,
    fontWeight: 500,
  },
});

export function ParagraphLyrics({ lyrics }: Props) {
  const { playerRef } = useAppContext();
  const line = useLyricsState(playerRef, lyrics);
  const currentLine = useRef<HTMLSpanElement>();

  useEffect(() => {
    const curLine = currentLine.current;
    const lines = lyrics.lines;
    const animate = lines && line !== null &&
      ((line + 1 > lines.length) || (!lines[line + 1]) ||
        (lines[line + 1].position - lines[line].position >= ANIMATION_THRESHOLD));
    if (curLine) {
      curLine.scrollIntoView({ block: "center", behavior: animate ? "smooth" : "auto" });
    }
  }, [currentLine, line, lyrics.lines]);

  return <Box style={{
    padding: 4,
    width: "100%",
    height: "100%",
    overflow: "hidden",
    textAlign: "justify",
    maskBorderImageSource: "linear-gradient(180deg, rgba(0,0,0,0) 0% , rgba(0,0,0,1) 49%, rgba(0,0,0,1) 51%, rgba(0,0,0,0) 100%)",
    maskBorderImageSlice: "49% 0 fill",
    maskBorderImageWidth: "40% 0",
    maskBoxImageSource: "linear-gradient(180deg, rgba(0,0,0,0) 0% , rgba(0,0,0,1) 49%, rgba(0,0,0,1) 51%, rgba(0,0,0,0) 100%)",
    maskBoxImageSlice: "49% 0 fill",
    maskBoxImageWidth: "40% 0",
    "-webkit-mask-box-image-source": "linear-gradient(180deg, rgba(0,0,0,0) 0% , rgba(0,0,0,1) 49%, rgba(0,0,0,1) 51%, rgba(0,0,0,0) 100%)",
    "-webkit-mask-box-image-slice": "49% 0 fill",
    "-webkit-mask-box-image-width": "40% 0",
  } as unknown as CSSProperties}>
    <Box sx={{height: "50%",}}/>
    {lyrics.lines.map((v, idx) => {
      const offset = line !== null ? Math.abs(line - idx) : idx;
      return (
        <>
          {idx !== 0 && <StyledLine key={`${idx}-divider`} style={{ filter: `blur(${offset * 0.1}px)` }}> ・ </StyledLine>}
          <StyledLine
            key={idx}
            lang="ja"
            className={clsx(idx === line && "active")} ref={idx === line ? currentLine : null}
            style={{ filter: `blur(${offset * 0.1}px)` }}
          >
            {v.content || "＊"}
          </StyledLine>
        </>
      );
    })}
    <Box sx={{height: "50%",}}/>
  </Box>;
}