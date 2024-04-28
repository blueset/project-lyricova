import { forwardRef, memo, useEffect } from "react";
import { useSpring, animated } from "@react-spring/web";
import { LyricsKitLyricsLine } from "../../../../graphql/LyricsKitObjects";
import { RowRendererProps } from "./LyricsVirtualizer";
import { styled } from "@mui/material/styles";
import { LineRenderer } from "./LineRenderer";

const RowContainer = styled(animated.div)(({"data-role": role, "data-minor": minor}: {"data-role": number, "data-minor": boolean}) => [
  {
    position: "absolute",
    fontSize: "2em",
    willChange: "translate, opacity, filter",
    minHeight: "0.5em",
    maxWidth: "calc(100% - 4rem)",
    transition: "filter 0.5s",
    "&:hover": {
      filter: "blur(0) !important",
      backgroundColor: "color-mix(in srgb, currentcolor 20%, transparent)",
    },
  },
  role % 3 === 0 && { 
    textAlign: "start",
    padding: "1rem 3rem 1rem 2rem",
    left: 0,
    borderRadius: "0 0.75rem 0.75rem 0",
  },
  role % 3 === 1 && { 
    textAlign: "end",
    padding: "1rem 2rem 1rem 3rem",
    right: 0,
    borderRadius: "0.75rem 0 0 0.75rem ",
  },
  role % 3 === 2 && { 
    textAlign: "center",
    padding: "1rem 0",
    width: "100%",
    borderRadius: "0.75rem",
  },
  minor && { fontSize: "1.25em" },
]);

const TranslationContainer = styled("div")((props: { dim: boolean }) => ({
  opacity: props.dim ? 0.5 : 1,
  fontSize: "0.625em",
}));

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
      <RowContainer
        ref={ref}
        style={{
          ...springs,
        }}
        onClick={onClick}
        data-role={row.attachments.role}
        data-minor={row.attachments.minor}
      >
        <LineRenderer
          line={row}
          start={segment.start}
          end={segment.end}
          ref={animationRef}
        />
        <TranslationContainer dim={absoluteIndex > 0 && !isActive}>
          {row.attachments.translation}
        </TranslationContainer>
      </RowContainer>
    );
  }
);

InnerRowRenderer.displayName = "RowRenderer";

export const RowRenderer = memo(
  InnerRowRenderer,
  (prev, next) =>
    prev.top === next.top &&
    prev.isActive === next.isActive &&
    prev.isActiveScroll === next.isActiveScroll
);
