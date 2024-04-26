import { forwardRef, memo, useEffect, useRef } from "react";
import { useSpring, useSpringRef, animated, config } from "@react-spring/web";
import { LyricsKitLyricsLine } from "../../../../graphql/LyricsKitObjects";
import { RowRendererProps } from "./LyricsVirtualizer";
import { styled } from "@mui/material/styles";
import { LineRenderer } from "./LineRenderer";

const RowContainer = styled(animated.div)(({
  position: "absolute",
  fontSize: "2em",
  willChange: "translate, opacity",
  minHeight: "0.5em",
  maxWidth: "calc(100% - 4rem)",
  paddingBlockEnd: "1rem",
}));

const TranslationContainer = styled("div")((props: { dim: boolean }) => ({
  opacity: props.dim ? 0.5 : 1,
  fontSize: "0.625em"
}));

const InnerRowRenderer = forwardRef<
  HTMLDivElement,
  RowRendererProps<LyricsKitLyricsLine>
>(({ row, segment, top, absoluteIndex, isActive, animationRef }, ref) => {
  const [springs, api] = useSpring(() => ({
    from: { y: top, opacity: 1, filter: "blur(0)" },
    config: {mass: 0.85, friction: 15, tension: 100},
  }));

  useEffect(() => {
    const old = api.current[0]?.get().y;
    const direction = old > top ? 1 : -1;
    const delay = Math.max(0, absoluteIndex * direction) * 30;
    api.start({ to: {
      y: top,
      opacity: absoluteIndex <= 0 && !isActive ? 0.5 : 1,
      filter: `blur(${Math.abs(absoluteIndex) * 0.3}px)`
    }, delay });
  }, [absoluteIndex, api, isActive, top]);

  return (
    <RowContainer
      ref={ref}
      style={{
        ...springs,
      }}
    >
      <LineRenderer line={row} start={segment.start} end={segment.end} ref={animationRef} />
      <TranslationContainer dim={absoluteIndex > 0 && !isActive}>{row.attachments.translation}</TranslationContainer>
    </RowContainer>
  );
});

InnerRowRenderer.displayName = "RowRenderer";

export const RowRenderer = memo(
  InnerRowRenderer,
  (prev, next) => prev.top === next.top && prev.isActive === next.isActive
);
