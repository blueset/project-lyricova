import {
  forwardRef,
  memo,
  useCallback,
  useImperativeHandle,
  useRef,
} from "react";
import { LyricsKitLyricsLine } from "../../../../graphql/LyricsKitObjects";
import { styled } from "@mui/material/styles";
import { LyricsAnimationRef } from "../components/AnimationRef.type";
import { LineRenderer, TimedSpanProps } from "../components/RubyLineRenderer";

const FILLED_OPACITY = 100;
const BLANK_OPACITY = 50;

const TimedSpan = forwardRef<
  LyricsAnimationRef,
  TimedSpanProps
>(function TimedSpan({ startTime, endTime, static: isStatic, children }, ref) {
  // const spanRef = useRef<HTMLSpanElement>(null);
  const webAnimationRefs = useRef<Animation[]>([]);
  const refCallback = useCallback(
    (node?: HTMLSpanElement) => {
      // webAnimationRefs.current.forEach(anim => anim.cancel());
      if (isStatic) {
        if (node && node.style.opacity !== "1") {
          node.style.opacity = "1";
          const duration = Math.max(0.1, endTime - startTime);
          webAnimationRefs.current = [
            node.animate(
              [
                { opacity: "0.5" },
                { opacity: "1", offset: 0.1 },
                { opacity: "1", offset: 0.9 },
                { opacity: "0.5", offset: 1 },
              ],
              {
                delay: startTime * 1000,
                duration: duration * 1000,
                fill: "both",
                id: `static-mask-${startTime}-${endTime}-${children}`,
              }
            ),
          ];
        }
      } else {
        if (node && node.style.maskRepeat !== "no-repeat") {
          node.style.maskImage = `linear-gradient(
            to right, 
            color-mix(in srgb, currentcolor ${FILLED_OPACITY}%, transparent) 50%, 
            color-mix(in srgb, currentcolor ${BLANK_OPACITY}%, transparent) 50%
          )`;
          node.style.maskSize = "200% 100%";
          node.style.maskRepeat = "no-repeat";
          node.style.maskOrigin = "left";
          const duration = Math.max(0.1, endTime - startTime);
          // console.log("duration: %o, startTime: %o, endTime: %o", duration, startTime, endTime);
          webAnimationRefs.current = [
            node.animate(
              [
                { maskPosition: "100% 0" },
                { maskPosition: "0 0" },
              ],
              {
                delay: startTime * 1000,
                duration: duration * 1000,
                fill: "both",
                id: `mask-${startTime}-${endTime}-${children}`,
              }
            ),
          ];
        }
      }
    },
    [children, endTime, isStatic, startTime]
  );
  useImperativeHandle(ref, () => ({
    resume(time?: number) {
      // console.log("Resume at %o, %o", time ?? "current time", webAnimationRefs.current);
      webAnimationRefs.current.forEach((anim) => {
        anim.currentTime = time ? time * 1000 : 0;
        if (time <= endTime) anim.play();
        else anim.pause();
      });
    },
    pause(time?: number) {
      // console.log("Pause at %o, %o", time ?? "current time", webAnimationRefs.current);
      webAnimationRefs.current.forEach((anim) => {
        anim.pause();
        anim.currentTime = time ? time * 1000 : 0;
      });
    },
  }));
  return <span ref={refCallback}>{children}</span>;
});

const InnerLineDiv = styled("div")`
  font-weight: 600;
  line-height: 1.4;
  text-wrap: balance;
  word-break: auto-phrase;
`;

export const RingollLineRenderer = memo(
  forwardRef<
    LyricsAnimationRef,
    { line: LyricsKitLyricsLine; start: number; end: number }
  >(({ line, start, end }, ref) => {
    return (
      <LineRenderer
        line={line}
        start={start}
        end={end}
        lineContainer={InnerLineDiv}
        timedSpan={TimedSpan}
        ref={ref}
      />
    );
  })
);

RingollLineRenderer.displayName = "RingollLineRenderer";
