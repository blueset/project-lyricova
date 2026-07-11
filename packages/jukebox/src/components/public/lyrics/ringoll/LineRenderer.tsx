import { forwardRef, memo, useCallback } from "react";
import type { LyricsKitLyricsLine } from "@lyricova/components/gql/schema";
import type { LyricsAnimationRef } from "../components/AnimationRef.type";
import type { TimedSpanProps } from "../components/RubyLineRenderer";
import { LineRenderer } from "../components/RubyLineRenderer";
import { safeDuration } from "../../../../frontendUtils/safeDuration";
import { useWebAnimationController } from "../../../../hooks/useWebAnimationController";

const FILLED_OPACITY = 100;
const BLANK_OPACITY = 50;

const TimedSpan = forwardRef<LyricsAnimationRef, TimedSpanProps>(
  function TimedSpan({ startTime, endTime, static: isStatic, children }, ref) {
    const createAnimation = useCallback(
      (node: HTMLSpanElement) => {
        const duration = safeDuration(startTime, endTime, 0.1, {
          children,
        });
        if (isStatic) {
          return node.animate(
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
            },
          );
        }
        return node.animate(
          [{ maskPosition: "100% 0" }, { maskPosition: "0 0" }],
          {
            delay: startTime * 1000,
            duration: duration * 1000,
            fill: "both",
            id: `mask-${startTime}-${endTime}-${children}`,
          },
        );
      },
      [children, endTime, isStatic, startTime],
    );
    const refCallback = useWebAnimationController(ref, createAnimation);
    return (
      <span
        ref={refCallback}
        style={
          isStatic
            ? { opacity: 1 }
            : {
                maskImage: `linear-gradient(
                  to right,
                  color-mix(in srgb, currentcolor ${FILLED_OPACITY}%, transparent) 50%,
                  color-mix(in srgb, currentcolor ${BLANK_OPACITY}%, transparent) 50%
                )`,
                maskSize: "200% 100%",
                maskRepeat: "no-repeat",
              }
        }
      >
        {children}
      </span>
    );
  },
);

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
        lineContainer="div"
        lineContainerProps={{
          className: "font-semibold leading-snug text-balance",
          style: { wordBreak: "auto-phrase" },
        }}
        timedSpan={TimedSpan}
        ref={ref}
      />
    );
  }),
);

RingollLineRenderer.displayName = "RingollLineRenderer";
