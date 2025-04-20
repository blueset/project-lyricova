import type { LyricsKitLyrics } from "@lyricova/api/graphql/types";
import { useAppContext } from "../AppContext";
import { useLyricsState } from "../../../hooks/useLyricsState";
import { useRef, useEffect, Fragment } from "react";
import { cn } from "@lyricova/components/utils";

const ANIMATION_THRESHOLD = 0.25;

interface Props {
  lyrics: LyricsKitLyrics;
}

const lineClasses = cn(
  "font-normal text-[2.5em] opacity-50 mb-1",
  "data-active:opacity-100 data-active:font-medium"
);

export function ParagraphLyrics({ lyrics }: Props) {
  const { playerRef } = useAppContext();
  const line = useLyricsState(playerRef, lyrics);
  const currentLine = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const curLine = currentLine.current;
    const lines = lyrics.lines;
    const animate =
      lines &&
      line !== null &&
      (line + 1 > lines.length ||
        !lines[line + 1] ||
        lines[line + 1].position - lines[line].position >= ANIMATION_THRESHOLD);
    if (curLine) {
      curLine.scrollIntoView({
        block: "center",
        behavior: animate ? "smooth" : "auto",
      });
    }
  }, [currentLine, line, lyrics.lines]);

  const containerStyle: React.CSSProperties = {
    // @ts-expect-error Non-standard properties
    maskBorderImageSource:
      "linear-gradient(180deg, rgba(0,0,0,0) 0% , rgba(0,0,0,1) 49%, rgba(0,0,0,1) 51%, rgba(0,0,0,0) 100%)",
    maskBorderImageSlice: "49% 0 fill",
    maskBorderImageWidth: "40% 0",
    WebkitMaskBoxImageSource:
      "linear-gradient(180deg, rgba(0,0,0,0) 0% , rgba(0,0,0,1) 49%, rgba(0,0,0,1) 51%, rgba(0,0,0,0) 100%)",
    WebkitMaskBoxImageSlice: "49% 0 fill",
    WebkitMaskBoxImageWidth: "40% 0",
  };

  return (
    <div
      className="p-1 w-full h-full overflow-hidden text-justify"
      style={containerStyle}
    >
      <div className="h-1/2" />
      {lyrics.lines.map((v, idx) => {
        const offset = line !== null ? Math.abs(line - idx) : idx;
        const isActive = idx === line;
        return (
          <Fragment key={idx}>
            {idx !== 0 && (
              <span
                className={lineClasses}
                style={{ filter: `blur(${offset * 0.1}px)` }}
              >
                {" "}
                ・{" "}
              </span>
            )}
            <span
              lang="ja"
              className={lineClasses}
              data-active={isActive ? "true" : undefined}
              ref={isActive ? currentLine : null}
              style={{ filter: `blur(${offset * 0.1}px)` }}
            >
              {v.content || "＊"}
            </span>
          </Fragment>
        );
      })}
      <div className="h-1/2" />
    </div>
  );
}
