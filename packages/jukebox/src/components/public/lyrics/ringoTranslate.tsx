import type {
  LyricsKitLyrics,
  LyricsKitLyricsLine,
} from "../../../graphql/LyricsKitObjects";
import { useAppContext } from "../AppContext";
import { useLyricsState } from "../../../frontendUtils/hooks";
import { styled } from "@mui/material";
import Balancer from "react-wrap-balancer";
import _ from "lodash";
import { useLayoutEffect, useRef } from "react";
import { useAppSelector } from "../../../redux/public/store";
import { currentSongSelector } from "../../../redux/public/playlist";

// const ANIMATION_THRESHOLD = 0.25;
const RENDER_LINES = 20;

const ContainerDiv = styled("div")`
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
  mask-border-image-source: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0) 0%,
    rgba(0, 0, 0, 1) 49%,
    rgba(0, 0, 0, 1) 51%,
    rgba(0, 0, 0, 0) 100%
  );
  mask-border-image-slice: 49% 0 fill;
  mask-border-image-width: 35px 0 50%;
  mask-box-image-source: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0) 0%,
    rgba(0, 0, 0, 1) 49%,
    rgba(0, 0, 0, 1) 51%,
    rgba(0, 0, 0, 0) 100%
  );
  mask-box-image-slice: 49% 0 fill;
  mask-box-image-width: 35px 0 50%;
  -webkit-mask-box-image-source: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0) 0%,
    rgba(0, 0, 0, 1) 49%,
    rgba(0, 0, 0, 1) 51%,
    rgba(0, 0, 0, 0) 100%
  );
  -webkit-mask-box-image-slice: 49% 0 fill;
  -webkit-mask-box-image-width: 35px 0 50%;
`;
const LineDiv = styled("div")`
  font-weight: 600;
  line-height: 1.2;
  text-wrap: balance;
  font-size: 3em;
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
  position: absolute;
  width: 90%;
  left: 30px;
  color: rgba(255, 255, 255, 0.4);
  --jukebox-cover-filter-bright-blur: var(--jukebox-cover-filter-bright)
    blur(var(--jukebox-ringo-blur-radius));
  filter: var(
    --jukebox-cover-filter-bright-blur,
    blur(var(--jukebox-ringo-blur-radius))
  );
  transform-origin: top left;
  opacity: 0.3;
  mix-blend-mode: overlay;
  color: white;
  transition: top 0.35s cubic-bezier(0.16, 1, 0.3, 1), transform 0.35s cubic-bezier(0.16, 1, 0.3, 1),
    opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1), translate 0.35s cubic-bezier(0.16, 1, 0.3, 1), scale 0.35s cubic-bezier(0.16, 1, 0.3, 1);

  & .translation {
    display: block;
    font-size: 0.7em;
    background-size: cover;
    background-position: center;
    background-attachment: fixed;
  }

  &[data-offset="20"] {
    transition-duration: 0s;
  }
  &[data-offset="-1"] {
    --jukebox-ringo-blur-radius: 0.4px;
  }

  &[data-offset="0"] {
    opacity: 0.7;
    filter: var(
      --jukebox-cover-filter-brighter,
      blur(var(--jukebox-ringo-blur-radius))
    );
    mix-blend-mode: hard-light;
  }

  ${_.range(1, RENDER_LINES).map((v) => {
    return `
    &[data-offset="${v}"] {
      --jukebox-ringo-blur-radius: ${0.4 * v}px;
      transition-delay: ${0.035 * (v - 1)}s;
    }
    `;
  })}
`;

interface LyricsLineElementProps {
  className: string;
  line: LyricsKitLyricsLine | null;
  offsetIndex: number;
}

function LyricsLineElement({
  className,
  line,
  offsetIndex,
}: LyricsLineElementProps) {
  if (!line) return null;

  return (
    <LineDiv lang="ja" data-offset={offsetIndex} className={className}>
      <Balancer>{line.content}</Balancer>
      {line.attachments?.translation && (
        <div className="translation" lang="zh">
          <Balancer>{line.attachments.translation}</Balancer>
        </div>
      )}
    </LineDiv>
  );
}

interface Props {
  lyrics: LyricsKitLyrics;
  resize?: boolean;
}

export function RingoTranslateLyrics({ lyrics }: Props) {
  const { playerRef } = useAppContext();
  const line = useLyricsState(playerRef, lyrics);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentSong = useAppSelector(currentSongSelector);

  const lines = lyrics.lines;

  const lineNumber = line || 0;

  const useTop = navigator.userAgent.includes("Chrome") && currentSong?.hasCover;

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const lines = container.querySelectorAll<HTMLDivElement>(":scope > div");
    const gap = 35;
    let start = 0,
      offset = 100;
    if (lines[0].dataset.offset === "-1") {
      start += 1;
      lines[0].style.scale = "1";
      if (useTop) {
        lines[0].style.top = `${offset - gap - lines[0].clientHeight}px`;
      } else {
        lines[0].style.translate = `0 ${offset -
          gap -
          lines[0].clientHeight}px`;
      }
    }
    for (let i = start; i < lines.length; i++) {
      const line = lines[i];
      const scale = line.dataset.offset === "0" ? 1 / 0.9 : 1;
      if (useTop) {
        line.style.top = `${offset}px`;
        line.style.scale = `${scale}`;
      } else {
        line.style.translate = `0 ${offset}px`;
        line.style.scale = `${scale}`;
      }
      offset += line.clientHeight * scale + gap;
    }
  }, [line, useTop]);

  return (
    <ContainerDiv ref={containerRef}>
      {lines.map((l, idx) => {
        if (idx < lineNumber - 1 || idx > lineNumber + RENDER_LINES)
          return null;
        return (
          <LyricsLineElement
            className={useTop ? "coverMask" : ""}
            line={l}
            key={idx}
            offsetIndex={line !== null ? idx - line : idx + 1}
          />
        );
      })}
    </ContainerDiv>
  );
}
