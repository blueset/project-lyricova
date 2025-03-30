import type { LyricsKitLyrics, LyricsKitLyricsLine } from "@lyricova/api/graphql/types";
import { styled } from "@mui/material";
import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useRef } from "react";
import clsx from "clsx";
import React from "react";
import { LyricsVirtualizer, RowRendererProps } from "./components/LyricsVirtualizer";
import { LineRenderer, TimedSpanProps } from "./components/RubyLineRenderer";
import type { LyricsAnimationRef } from "./components/AnimationRef.type";
import { useSpring, animated } from "@react-spring/web";

const TimedSpan = forwardRef<LyricsAnimationRef, TimedSpanProps>(
  function TimedSpan({startTime, endTime, children}, ref) {
    const webAnimationRef = useRef<Animation | null>(null);
    const refCallback = useCallback((node?: HTMLSpanElement) => {
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
    }, [children, startTime, endTime]);
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

const StyledLine = styled(animated.div)({
  fontWeight: 400,
  opacity: 0.7,
  minHeight: "1.2em",
  fontSize: "1.5em",
  textAlign: "start",
  position: "absolute",
  width: "calc(100% - 32px)",
  maxWidth: 800,
  marginInline: "calc(max(0px, 50% - 400px))",
  paddingInline: 32,
  paddingBlockStart: 16,
  transition: "opacity 0.5s",
  "&.active": {
    opacity: 1,
    fontWeight: 600,
  },
  "&.past": {
    opacity: 0.5,
  },
  "& .translation": {
    fontSize: "0.8em",
  },
  "&[data-minor='true']": {
    fontSize: "1em",
  },
  "&[data-role='1']": {
    textAlign: "end",
  },
  "&[data-role='2']": {
    textAlign: "center",
  },
});

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
      <StyledLine
        ref={ref}
        style={{
          ...springs,
        }}
        className={clsx(isActive && "active", absoluteIndex < 0 && "past")}
        onClick={onClick}
        data-role={row.attachments.role}
        data-minor={row.attachments.minor}
        lang="ja"
      >
        <MemoedLineRenderer
          line={row}
          start={segment.start}
          end={segment.end}
          ref={animationRef}
        />
        <div className="translation" lang={transLang}>
          {row.attachments.translations[transLang]}
        </div>
      </StyledLine>
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

const StyledContainer = styled("div")`
  padding: 4;
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
  text-align: justify;
  mask-border-image-source: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0) 0%,
    rgba(0, 0, 0, 1) 49%,
    rgba(0, 0, 0, 1) 51%,
    rgba(0, 0, 0, 0) 100%
  );
  mask-border-image-slice: 49% 0 fill;
  mask-border-image-width: 30% 0;
  mask-box-image-source: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0) 0%,
    rgba(0, 0, 0, 1) 49%,
    rgba(0, 0, 0, 1) 51%,
    rgba(0, 0, 0, 0) 100%
  );
  mask-box-image-slice: 49% 0 fill;
  mask-box-image-width: 30% 0;
  -webkit-mask-box-image-source: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0) 0%,
    rgba(0, 0, 0, 1) 49%,
    rgba(0, 0, 0, 1) 51%,
    rgba(0, 0, 0, 0) 100%
  );
  -webkit-mask-box-image-slice: 49% 0 fill;
  -webkit-mask-box-image-width: 30% 0;
`;

interface Props {
  lyrics: LyricsKitLyrics;
  transLangIdx: number;
}

export function PlainLyrics({ lyrics, transLangIdx }: Props) {
  const lang = lyrics.translationLanguages[transLangIdx];
  return (
    <LyricsVirtualizer rows={lyrics.lines} estimatedRowHeight={20} containerAs={StyledContainer} align="center" alignAnchor={0.5}>
      {(props) => props.row && <RowRenderer key={props.row.position} transLang={lang} {...props} />}
    </LyricsVirtualizer>
  );
}
