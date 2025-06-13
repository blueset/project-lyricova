import { forwardRef, memo, useEffect } from "react";
import { useSpring, animated } from "@react-spring/web";
import { LyricsKitLyricsLine } from "@lyricova/api/graphql/types";
import { RowRendererProps } from "../components/LyricsVirtualizer";
import { RingollLineRenderer } from "./LineRenderer";
import { cn } from "@lyricova/components/utils";

const rowContainerClasses = cn(
  "absolute",
  "text-4xl", // fontSize: "2em"
  "will-change-[transform,opacity,filter]",
  "min-h-[0.5em]",
  "max-w-full",
  "hover:!blur-none hover:bg-current/20", // filter: blur(0), backgroundColor: color-mix(...)

  // role % 3 === 0
  "data-[role='0']:text-start data-[role='0']:py-4 data-[role='0']:pl-8 data-[role='0']:pr-12 data-[role='0']:left-0 data-[role='0']:rounded-tr-[0.75rem] data-[role='0']:rounded-br-[0.75rem]",
  // role % 3 === 1
  "data-[role='1']:text-end data-[role='1']:py-4 data-[role='1']:pr-8 data-[role='1']:pl-12 data-[role='1']:right-0 data-[role='1']:rounded-tl-[0.75rem] data-[role='1']:rounded-bl-[0.75rem]",
  // role % 3 === 2
  "data-[role='2']:text-center data-[role='2']:py-4 data-[role='2']:w-full data-[role='2']:rounded-[0.75rem]",

  // minor
  "data-[minor='true']:text-xl"
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
      absoluteIndex,
      isActive,
      isActiveScroll,
      animationRef,
      onClick,
      transLang,
    },
    ref
  ) => {
    const [springs, api] = useSpring(() => ({
      from: { y: top, opacity: 1, filter: "blur(0)" },
      config: { mass: 0.85, friction: 15, tension: 100 },
    }));

    useEffect(() => {
      const old = api.current[0]?.get().y;
      const direction = old > top ? 1 : -1;
      const delay = isActiveScroll
        ? 0
        : Math.max(0, absoluteIndex * direction) * 30;
      api.start({
        to: {
          y: top,
          opacity: absoluteIndex <= 0 && !isActive ? 0.5 : 1,
          filter: isActiveScroll
            ? "blur(0)"
            : `blur(${Math.abs(absoluteIndex) * 0.3}px)`,
        },
        delay,
      });
    }, [absoluteIndex, api, isActive, isActiveScroll, top]);

    return (
      <animated.div
        ref={ref}
        style={{
          ...springs,
        }}
        onClick={onClick}
        data-role={row.attachments.role % 3}
        data-minor={row.attachments.minor}
        className={rowContainerClasses}
      >
        <RingollLineRenderer
          line={row}
          start={segment.start}
          end={segment.end}
          ref={animationRef}
        />
        <div
          className={cn(
            "text-[0.625em] text-balance", // fontSize, textWrap
            absoluteIndex > 0 && !isActive && "opacity-40" // dim opacity
          )}
          // @ts-expect-error TypeScript doesn't know about the `wordBreak` property
          style={{ wordBreak: "auto-phrase" }} // wordBreak
          lang={transLang}
        >
          {row.attachments.translations[transLang]}
        </div>
      </animated.div>
    );
  }
);

InnerRowRenderer.displayName = "InnerRowRenderer";

export const RowRenderer = memo(
  InnerRowRenderer,
  (prev, next) =>
    prev.top === next.top &&
    prev.transLang === next.transLang &&
    prev.isActive === next.isActive &&
    prev.isActiveScroll === next.isActiveScroll
);
