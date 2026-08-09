import type {
  LyricsKitLyrics,
  LyricsKitLyricsLine,
} from "@lyricova/components/gql/schema";
import { forwardRef, memo, useCallback, useEffect } from "react";
import { cn } from "@lyricova/components/utils";
import type { RowRendererProps } from "./components/LyricsVirtualizer";
import { LyricsVirtualizer } from "./components/LyricsVirtualizer";
import type { TimedSpanProps } from "./components/RubyLineRenderer";
import { LineRenderer } from "./components/RubyLineRenderer";
import { safeDuration } from "../../../frontendUtils/safeDuration";
import type { LyricsAnimationRef } from "./components/AnimationRef.type";
import { useSpring, animated } from "@react-spring/web";
import { useWebAnimationController } from "../../../hooks/useWebAnimationController";
import { getSelectedTranslation } from "./translation";
import { centeredFutureLineViewportPadding } from "./components/activeRangeViewportPadding";
import type { LyricsViewportSize } from "./components/lyricsLayoutProjection";

/** `text-[1.5em]` against the layout's 16px base font. */
const PLAIN_MAIN_FONT_SIZE_PX = 24;

function plainActiveRangeViewportPadding({ height }: LyricsViewportSize) {
  return centeredFutureLineViewportPadding(PLAIN_MAIN_FONT_SIZE_PX, height);
}

/** Render a timed opacity span controlled by its parent lyrics line. */
const TimedSpan = forwardRef<LyricsAnimationRef, TimedSpanProps>(
  function TimedSpan({ startTime, endTime, children }, ref) {
    const createAnimation = useCallback(
      (node: HTMLSpanElement) => {
        const duration = safeDuration(startTime, endTime, 0.1, { children });
        return node.animate(
          [{ opacity: "0.5" }, { opacity: "1", offset: 0.1 }, { opacity: "1" }],
          {
            delay: startTime * 1000,
            duration: duration * 1000,
            fill: "both",
            id: `static-mask-${startTime}-${endTime}-${children}`,
          },
        );
      },
      [children, startTime, endTime],
    );
    const refCallback = useWebAnimationController(ref, createAnimation);
    return (
      <span ref={refCallback} style={{ opacity: 1 }}>
        {children}
      </span>
    );
  },
);

const MemoedLineRenderer = memo(
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
  }),
);

MemoedLineRenderer.displayName = "LineRenderer";

const lineClasses = cn(
  "font-normal opacity-70 min-h-[1.2em] text-[1.5em] text-start absolute w-[calc(100%-32px)] max-w-[800px] mx-[calc(max(0px,50%-400px))] px-8 pt-4 transition-opacity duration-500",
  "data-[active=true]:opacity-100 data-[active=true]:font-semibold",
  "data-[past=true]:opacity-50",
  "data-[minor=true]:text-[1em]",
  "data-[role='1']:text-end",
  "data-[role='2']:text-center",
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
      isCompacted = false,
      animationRef,
      onClick,
      transLang,
      absoluteIndex,
      isUserScrolling,
    },
    ref,
  ) => {
    const [springs, api] = useSpring(() => ({
      from: { y: top },
    }));

    useEffect(() => {
      api.start({ to: { y: top }, immediate: isUserScrolling });
    }, [api, isUserScrolling, top]);

    const translation = getSelectedTranslation(
      row.attachments.translations,
      transLang,
    );

    return (
      <animated.div
        ref={ref}
        style={{
          ...springs,
        }}
        onClick={isCompacted ? undefined : onClick}
        aria-hidden={isCompacted || undefined}
        data-role={row.attachments.role}
        data-minor={row.attachments.minor}
        data-active={isActive}
        data-past={absoluteIndex < 0}
        data-compacted={isCompacted ? "true" : "false"}
        className={cn(
          lineClasses,
          isCompacted && "pointer-events-none !opacity-0",
        )}
        lang="ja"
      >
        <MemoedLineRenderer
          line={row}
          start={segment.start}
          end={segment.end}
          ref={animationRef}
        />
        <div className="text-[0.8em]" lang={transLang}>
          {translation}
        </div>
      </animated.div>
    );
  },
);

InnerRowRenderer.displayName = "InnerRowRenderer";

const RowRenderer = memo(
  InnerRowRenderer,
  (prev, next) =>
    prev.top === next.top &&
    prev.transLang === next.transLang &&
    prev.isActive === next.isActive &&
    prev.isCompacted === next.isCompacted &&
    prev.absoluteIndex === next.absoluteIndex &&
    prev.isActiveScroll === next.isActiveScroll &&
    prev.isUserScrolling === next.isUserScrolling,
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
          "size-full overflow-hidden relative text-justify mask-y-from-70% mask-y-to-100%",
      }}
      viewportClassName="p-4"
      align="center"
      alignAnchor={0.5}
      activeRangeMode="compact"
      activeRangeViewportPadding={plainActiveRangeViewportPadding}
    >
      {(props) =>
        props.row && (
          <RowRenderer key={props.row.position} transLang={lang} {...props} />
        )
      }
    </LyricsVirtualizer>
  );
}
