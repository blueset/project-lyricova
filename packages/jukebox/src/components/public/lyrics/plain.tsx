import type {
  LyricsKitLyrics,
  LyricsKitLyricsLine,
} from "@lyricova/api/graphql/types";
import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import clsx from "clsx";
import React from "react";
import { cn } from "@lyricova/components/utils";
import {
  LyricsVirtualizer,
  RowRendererProps,
} from "./components/LyricsVirtualizer";
import { LineRenderer, TimedSpanProps } from "./components/RubyLineRenderer";
import type { LyricsAnimationRef } from "./components/AnimationRef.type";
import { useSpring, animated } from "@react-spring/web";

const TimedSpan = forwardRef<LyricsAnimationRef, TimedSpanProps>(
  function TimedSpan({ startTime, endTime, children }, ref) {
    const webAnimationRef = useRef<Animation | null>(null);
    const refCallback = useCallback(
      (node?: HTMLSpanElement) => {
        if (node && node.style.opacity !== "1") {
          node.style.opacity = "1";
          const duration = Math.max(0.1, endTime - startTime);
          webAnimationRef.current = node.animate(
            [
              { opacity: "0.5" },
              { opacity: "1", offset: 0.1 },
              { opacity: "1" },
            ],
            {
              delay: startTime * 1000,
              duration: duration * 1000,
              fill: "both",
              id: `static-mask-${startTime}-${endTime}-${children}`,
            }
          );
        }
      },
      [children, startTime, endTime]
    );
    useImperativeHandle(ref, () => ({
      resume(time?: number) {
        const anim = webAnimationRef.current;
        if (anim) {
          anim.currentTime = time ? time * 1000 : 0;
          if (time <= endTime) anim.play();
          else anim.pause();
        }
      },
      pause(time?: number) {
        const anim = webAnimationRef.current;
        if (anim) {
          anim.pause();
          anim.currentTime = time ? time * 1000 : 0;
        }
      },
    }));
    return <span ref={refCallback}>{children}</span>;
  }
);

export const MemoedLineRenderer = memo(
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
        timedSpan={TimedSpan}
        ref={ref}
      />
    );
  })
);

MemoedLineRenderer.displayName = "LineRenderer";

const lineClasses = cn(
  "font-normal opacity-70 min-h-[1.2em] text-[1.5em] text-start absolute w-[calc(100%-32px)] max-w-[800px] mx-[calc(max(0px,50%-400px))] px-8 pt-4 transition-opacity duration-500",
  "data-[active=true]:opacity-100 data-[active=true]:font-semibold",
  "data-[past=true]:opacity-50",
  "data-[minor=true]:text-[1em]",
  "data-[role='1']:text-end",
  "data-[role='2']:text-center"
);

const InnerRowRenderer = forwardRef<
  HTMLDivElement,
  RowRendererProps<LyricsKitLyricsLine>
>(
  (
    {
      row,
      segment,
      top,
      isActive,
      animationRef,
      onClick,
      transLang,
      absoluteIndex,
    },
    ref
  ) => {
    const [springs, api] = useSpring(() => ({
      from: { y: top },
    }));

    useEffect(() => {
      api.start({ to: { y: top } });
    }, [api, top]);

    return (
      <animated.div
        ref={ref}
        style={{
          ...springs,
        }}
        className={lineClasses}
        onClick={onClick}
        data-role={row.attachments.role}
        data-minor={row.attachments.minor}
        data-active={isActive}
        data-past={absoluteIndex < 0}
        lang="ja"
      >
        <MemoedLineRenderer
          line={row}
          start={segment.start}
          end={segment.end}
          ref={animationRef}
        />
        <div className="text-[0.8em]" lang={transLang}>
          {row.attachments.translations[transLang]}
        </div>
      </animated.div>
    );
  }
);

InnerRowRenderer.displayName = "InnerRowRenderer";

const RowRenderer = memo(
  InnerRowRenderer,
  (prev, next) =>
    prev.top === next.top &&
    prev.transLang === next.transLang &&
    prev.isActive === next.isActive &&
    prev.isActiveScroll === next.isActiveScroll
);

interface Props {
  lyrics: LyricsKitLyrics;
  transLangIdx: number;
}

export function PlainLyrics({ lyrics, transLangIdx }: Props) {
  const lang = lyrics.translationLanguages[transLangIdx];
  return (
    <LyricsVirtualizer
      rows={lyrics.lines}
      estimatedRowHeight={20}
      containerAs="div"
      containerProps={{
        className:
          "p-4 w-full h-full overflow-hidden relative text-justify mask-y-from-70% mask-y-to-100%",
      }}
      align="center"
      alignAnchor={0.5}
    >
      {(props) =>
        props.row && (
          <RowRenderer key={props.row.position} transLang={lang} {...props} />
        )
      }
    </LyricsVirtualizer>
  );
}
