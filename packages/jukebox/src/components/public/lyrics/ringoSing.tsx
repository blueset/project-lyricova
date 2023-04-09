import type {
  LyricsKitLyrics,
  LyricsKitLyricsLine,
  LyricsKitWordTimeTag,
} from "../../../graphql/LyricsKitObjects";
import { useAppContext } from "../AppContext";
import { useLyricsState, usePlayerState } from "../../../frontendUtils/hooks";
import { styled } from "@mui/material";
import Balancer from "react-wrap-balancer";
import _ from "lodash";
import { useEffect, useLayoutEffect, useRef } from "react";
import { useAppSelector } from "../../../redux/public/store";
import { currentSongSelector } from "../../../redux/public/playlist";
import clsx from "clsx";
import gsap from "gsap";

type Timeline = gsap.core.Timeline;

const COUNTDOWN_THRESHOLD = 5;
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
  opacity: 0.2;
  color: white;
  transition: top 0.35s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.35s cubic-bezier(0.16, 1, 0.3, 1),
    font-size 0.35s cubic-bezier(0.16, 1, 0.3, 1),
    opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1),
    translate 0.35s cubic-bezier(0.16, 1, 0.3, 1),
    scale 0.35s cubic-bezier(0.16, 1, 0.3, 1);

  &.empty:not([data-offset="0"]) {
    height: 0em;
  }

  & .translation {
    display: block;
    font-size: 0.7em;
    background-size: cover;
    background-position: center;
    background-attachment: fixed;
  }

  & [data-spanner] {
    vertical-align: -1px;
    transform-origin: bottom center;
    background-image: linear-gradient(to right, white, white);
    -webkit-background-clip: text;
    color: transparent;
  }

  &:not([data-offset="0"]) [data-spanner] {
    opacity: 1 !important;
    color: white !important;
  }

  &:not([data-offset="0"]) [data-countdown] {
    transform: scale(0) !important;
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
const CountdownDiv = styled("div")`
  display: block;
  font-size: 0.75rem;
  height: 1em;
  width: fit-content;
  opacity: 0;
  transform: scale(0);
  & > span {
    display: inline-block;
    height: 1em;
    width: 1em;
    border-radius: 0.5em;
    opacity: 0.2;
    margin-right: 0.75em;
    background-color: currentColor;
    &:last-child {
      margin-right: 0;
    }
  }
`;

function LineSpanner({ line }: { line: LyricsKitLyricsLine | null }) {
  if (!line?.content) return null;
  if (!line.attachments.timeTag?.tags)
    return <span data-spanner>{line.content}</span>;
  const tags = line.attachments.timeTag.tags;
  let ptr = 0;
  const result: string[] = [];
  for (let i = tags[0].index === 0 ? 1 : 0; i < tags.length; i++) {
    const tag = tags[i];
    result.push(line.content.slice(ptr, tag.index));
    ptr = tag.index;
  }
  if (ptr !== line.content.length) {
    result.push(line.content.slice(ptr));
  }
  return (
    <>
      {line.content.slice(0, tags[0].index)}
      {result.map((v, idx) => (
        <span data-spanner key={idx}>
          {v}
        </span>
      ))}
      {line.content.slice(ptr)}
    </>
  );
}

interface LyricsLineElementProps {
  className?: string;
  line: LyricsKitLyricsLine | null;
  index: number;
  offsetIndex: number;
}

function LyricsLineElement({
  className,
  line,
  index,
  offsetIndex,
}: LyricsLineElementProps) {
  if (!line) return null;

  return (
    <LineDiv
      lang="ja"
      data-offset={offsetIndex}
      data-index={index}
      className={className}
    >
      {line.content ? (
        <Balancer>
          <LineSpanner line={line} />
        </Balancer>
      ) : (
        <CountdownDiv data-countdown>
          <span />
          <span />
          <span />
        </CountdownDiv>
      )}
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

export function RingoSingLyrics({ lyrics }: Props) {
  const { playerRef } = useAppContext();
  const playerState = usePlayerState(playerRef);
  const line = useLyricsState(playerRef, lyrics);
  const containerRef = useRef<HTMLDivElement>(null);

  const lines = lyrics.lines;

  const lineNumber = line || 0;
  const lineObj = lines?.[line];
  const startTime = lineObj?.position ?? 0;
  const endTime =
    lines?.[line + 1]?.position ?? playerRef?.current.duration ?? Infinity;

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
      lines[0].style.translate = `0 ${offset - gap - lines[0].clientHeight}px`;
    }
    for (let i = start; i < lines.length; i++) {
      const line = lines[i];
      const scale = line.dataset.offset === "0" ? 1 / 0.9 : 1;
      line.style.translate = `0 ${offset}px`;
      line.style.scale = `${scale}`;
      offset += line.clientHeight * scale + gap;
    }
  }, [line]);

  const timelineRef = useRef<Timeline>();
  useEffect(() => {
    if (timelineRef.current) timelineRef.current.kill();
    const tl = gsap.timeline({ paused: playerState.state === "paused" });
    if (containerRef.current) {
      if (lineObj?.attachments?.timeTag) {
        const spans = containerRef.current.querySelectorAll(
          `div[data-index="${lineNumber}"] span[data-spanner]`
        );
        if (spans) {
          // console.log("animating", lineNumber, lineObj, spans);
          const tags = lineObj.attachments.timeTag.tags;
          tags.forEach((v: LyricsKitWordTimeTag, idx: number) => {
            const start = idx > 0 ? tags[idx].timeTag : 0;
            const duration =
              idx + 1 < tags.length ? tags[idx + 1].timeTag - start : 0;
            if (!spans[idx]) return;
            tl.fromTo(
              spans[idx],
              { y: -1 },
              {
                y: 0,
                duration: 0.2,
                onUpdate() {
                  const tgt = this.targets()[0];
                  tgt.style.verticalAlign = tgt._gsap.y;
                },
              },
              start
            );
            if (duration <= 1) {
              tl.fromTo(
                spans[idx],
                {
                  backgroundImage:
                    "linear-gradient(to right, white, white calc(0% + 0rem - 2rem), rgba(255,255,255,0.2) calc(0% - 2rem + 2rem), rgba(255,255,255,0.2) 100%)",
                },
                {
                  backgroundImage:
                    "linear-gradient(to right, white, white calc(100% + 2rem - 2rem), rgba(255,255,255,0.2) calc(100% - 0rem + 2rem), rgba(255,255,255,0.2) 100%)",
                  duration,
                  ease: "none",
                },
                start
              );
            } else {
              const halfTime = duration / 2;
              tl.set(spans[idx], { display: "inline-block" }, start);
              tl.fromTo(
                spans[idx],
                {
                  scale: 1,
                  backgroundImage:
                    "linear-gradient(to right, white, white calc(0% + 0rem - 2rem), rgba(255,255,255,0.2) calc(0% - 2rem + 2rem), rgba(255,255,255,0.2) 100%)",
                  textShadow: "0 0 0em rgba(255,255,255,0)",
                },
                {
                  duration: halfTime,
                  backgroundImage:
                    "linear-gradient(to right, white, white calc(100% + 2rem - 2rem), rgba(255,255,255,0.2) calc(100% - 0rem + 2rem), rgba(255,255,255,0.2) 100%)",
                  scale: 1.1,
                  textShadow: "0 0 0.5em rgba(255,255,255,0.75)",
                  ease: "circ.out",
                },
                start
              );
              tl.to(
                spans[idx],
                {
                  duration: halfTime,
                  scale: 1,
                  textShadow: "0 0 0em rgba(255,255,255,0.75)",
                  ease: "circ.in",
                },
                start + halfTime
              );
              tl.set(spans[idx], { display: "inline" }, start + duration);
            }
          });
        }
      } else if (
        lineObj &&
        !lineObj?.content &&
        endTime - startTime > COUNTDOWN_THRESHOLD
      ) {
        const countdownContainer = containerRef.current.querySelector(
          `div[data-index="${lineNumber}"] div[data-countdown]`
        );
        if (countdownContainer) {
          const countdownDots = countdownContainer.getElementsByTagName("span");
          const duration = endTime - startTime;
          const finalGrow = 0.75;
          const finalShrink = 0.25;
          const halfDot = (duration - finalGrow - finalShrink) / 6;
          const firstGrow = Math.min(halfDot / 2, 0.5);
          const largeScale = 1.2;
          const growEase = "power1.out";
          const shrinkEase = "power1.out";
          // first grow with container grow
          tl.fromTo(
            countdownContainer,
            {
              scale: 0,
              opacity: 0,
            },
            {
              scale: 1,
              opacity: 1,
              duration: firstGrow,
              ease: growEase,
            },
            0
          ).to(countdownContainer, {
            scale: largeScale,
            duration: halfDot - firstGrow,
            ease: growEase,
          });
          tl.fromTo(
            countdownDots[0],
            {
              opacity: 0.2,
            },
            {
              opacity: 1,
              duration: halfDot,
              ease: growEase,
            },
            0
          );
          tl.fromTo(
            countdownContainer,
            { scale: 1.1 },
            { scale: 1, ease: shrinkEase, duration: halfDot },
            halfDot
          );
          // second grow
          tl.fromTo(
            countdownDots[1],
            { opacity: 0.2 },
            { opacity: 1, duration: halfDot, ease: growEase },
            halfDot * 2
          );
          tl.fromTo(
            countdownContainer,
            { scale: 1 },
            { scale: largeScale, ease: growEase, duration: halfDot },
            halfDot * 2
          ).to(
            countdownContainer,
            { scale: 1, ease: shrinkEase, duration: halfDot },
            halfDot * 3
          );
          // third grow
          tl.fromTo(
            countdownDots[2],
            { opacity: 0.2 },
            { opacity: 1, duration: halfDot, ease: growEase },
            halfDot * 4
          );
          tl.fromTo(
            countdownContainer,
            { scale: 1 },
            { scale: largeScale, ease: growEase, duration: halfDot },
            halfDot * 4
          ).to(
            countdownContainer,
            { scale: 1, ease: shrinkEase, duration: halfDot },
            halfDot * 5
          );
          // final grow-shrink
          tl.fromTo(
            countdownContainer,
            { scale: 1 },
            { scale: largeScale, ease: growEase, duration: finalGrow },
            halfDot * 6
          ).to(
            countdownContainer,
            { scale: 0, ease: shrinkEase, duration: finalShrink },
            halfDot * 6 + finalGrow
          );
        }
      }
    }
    timelineRef.current = tl;
  }, [lineNumber, endTime, playerState.state, startTime, lineObj]);

  // Controls the progress of timeline
  useEffect(() => {
    const timeline = timelineRef.current;
    const now = performance.now();

    if (timeline) {
      if (playerState.state === "playing") {
        const inlineProgress =
          (now - playerState.startingAt) / 1000 - startTime;
        timeline.play(inlineProgress);
      } else {
        const inlineProgress = playerState.progress - startTime;
        timeline.pause(inlineProgress);
      }
    }
    // Removing currentFrame?.start as we don’t want it to trigger for every line update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerState]);

  return (
    <ContainerDiv ref={containerRef}>
      {lines.map((l, idx) => {
        if (idx < lineNumber - 1 || idx > lineNumber + RENDER_LINES)
          return null;
        return (
          <LyricsLineElement
            className={clsx(!l.content && "empty")}
            line={l}
            key={idx}
            index={idx}
            offsetIndex={line !== null ? idx - line : idx + 1}
          />
        );
      })}
    </ContainerDiv>
  );
}
