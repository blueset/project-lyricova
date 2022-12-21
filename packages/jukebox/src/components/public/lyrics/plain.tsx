import { LyricsKitLyrics } from "../../../graphql/LyricsKitObjects";
import { useAppContext } from "../AppContext";
import { useLyricsState } from "../../../frontendUtils/hooks";
import { Box, makeStyles, styled } from "@mui/material";
import { useRef, useEffect, CSSProperties } from "react";
import clsx from "clsx";
import BalanceText from "react-balance-text-cj";
import FuriganaLyricsLine from "../../FuriganaLyricsLine";
import React from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import AutoResizer from "react-virtualized-auto-sizer";

const ANIMATION_THRESHOLD = 0.25;
const MemoBalanceText = React.memo(BalanceText);

const rowStyle = (start: number) =>
  ({
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    transform: `translateY(${start}px)`,
  } as CSSProperties);

interface Props {
  lyrics: LyricsKitLyrics;
}

const StyledLine = styled("div")({
  fontWeight: 400,
  opacity: 0.7,
  minHeight: "1.2em",
  fontSize: "1.5em",
  textAlign: "center",
  marginBottom: 4,
  "&.active": {
    opacity: 1,
    fontWeight: 600,
  },
  "& .translation": {
    fontSize: "0.8em",
  },
});

export function PlainLyrics({ lyrics }: Props) {
  const { playerRef } = useAppContext();
  const { lines } = lyrics;
  const line = useLyricsState(playerRef, lyrics);
  const container = useRef<HTMLDivElement>();

  const virtualizer = useVirtualizer({
    count: lines.length + 2,
    getScrollElement: () => container.current,
    estimateSize: () => 500,
    overscan: 2,
  });

  useEffect(() => {
    const cont = container.current;
    const lines = lyrics.lines;
    const animate =
      lines &&
      line !== null &&
      (line + 1 > lines.length ||
        !lines[line + 1] ||
        lines[line + 1].position - lines[line].position >= ANIMATION_THRESHOLD);
    // if (cont) {
    //   cont
    //     .querySelector(`[data-idx="${line}"]`)
    //     ?.scrollIntoView({
    //       block: "center",
    //       behavior: animate ? "smooth" : "auto",
    //     });
    // }
    virtualizer.scrollToIndex(line + 1, {
      align: "center",
      behavior: animate ? "smooth" : "auto",
    });
  }, [container, line, lyrics.lines]);
  console.log(line);

  return (
    <div
      style={
        ({
          padding: 4,
          width: "100%",
          height: "100%",
          overflow: "hidden",
          textAlign: "justify",
          maskBorderImageSource:
            "linear-gradient(180deg, rgba(0,0,0,0) 0% , rgba(0,0,0,1) 49%, rgba(0,0,0,1) 51%, rgba(0,0,0,0) 100%)",
          maskBorderImageSlice: "49% 0 fill",
          maskBorderImageWidth: "40% 0",
          maskBoxImageSource:
            "linear-gradient(180deg, rgba(0,0,0,0) 0% , rgba(0,0,0,1) 49%, rgba(0,0,0,1) 51%, rgba(0,0,0,0) 100%)",
          maskBoxImageSlice: "49% 0 fill",
          maskBoxImageWidth: "40% 0",
        } as unknown) as CSSProperties
      }
      ref={container}
    >
      <div
        style={{
          height: virtualizer.getTotalSize(),
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map(({ key, index, start }) =>
          index === 0 || index === lines.length + 1 ? (
            <div
              key={key}
              data-index={index}
              style={{ height: "50vh", ...rowStyle(start) }}
              ref={virtualizer.measureElement}
            />
          ) : (
            <StyledLine
              key={index}
              data-index={index}
              className={clsx(index - 1 === line && "active")}
              ref={virtualizer.measureElement}
              style={rowStyle(start)}
            >
              <MemoBalanceText resize={true}>
                <FuriganaLyricsLine graphQLSourceLine={lines[index - 1]} />
              </MemoBalanceText>
              {lines[index - 1].attachments.translation && (
                <div className="translation">
                  <MemoBalanceText resize={true}>
                    {lines[index - 1].attachments.translation}
                  </MemoBalanceText>
                </div>
              )}
            </StyledLine>
          )
        )}
      </div>
    </div>
  );
}
