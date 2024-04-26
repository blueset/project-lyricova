import { forwardRef, memo, useEffect, useRef } from "react";
import { useSpring, useSpringRef, animated, config } from "@react-spring/web";
import { LyricsKitLyricsLine } from "../../../../graphql/LyricsKitObjects";
import { RowRendererProps } from "./LyricsVirtualizer";
import { styled } from "@mui/material/styles";
import { LineRenderer } from "./LineRenderer";

/**
 * Construct a CSS `calc()` expression such that:
 * if (start < x && x < end) { retrun inside; } else if (x < start || end < x) { return outside; }
 */
function calcIfInBetween(
  xName: string,
  start: number,
  end: number,
  inside: number,
  outside: number,
  unit = ""
) {
  // Base expression gives 1 if start < x < end, 0 otherwise.
  const baseExpression =
    "(" +
    `max(var(--${xName}) - ${start}${unit}, 0${unit}) / ` +
    `(var(--${xName}) - ${start}${unit})` +
    ") * (" +
    `max(${end}${unit} - var(--${xName}), 0${unit}) / ` +
    `(${end}${unit} - var(--${xName}))` +
    ")";

  if (inside < outside) {
    return `${inside}${unit} + ${baseExpression} * ${outside - inside}${unit}`;
  }
  return `${outside}${unit} - ${baseExpression} * ${outside - inside}${unit}`;
}

const RowContainer = styled(animated.div)(
  (props: { startMs: number; endMs: number }) => ({
    // const RowContainer = styled("div")((props: { startMs: number; endMs: number }) => ({
    // opacity: `calc(${calcIfInBetween(
    //   "lyrics-time",
    //   props.startMs - 0.5,
    //   props.endMs + 0.5,
    //   1,
    //   0.5
    // )})`,
    opacity: `calc(1 - sign(var(--lyrics-time) - ${props.endMs}) * 0.5)`,
    position: "absolute",
    fontSize: "2em",
    willChange: "translate, opacity",
    transition: "opacity 0.2s, translate 0.5s ease-out",
    minHeight: "0.5em",
    paddingBlockEnd: "1rem",
  })
);

const TranslationContainer = styled("div")((props: { startMs: number; }) => ({
  opacity: `calc(1 + sign(var(--lyrics-time) - ${props.startMs}) * 0.5)`,
  fontSize: "0.625em"
}));

const InnerRowRenderer = forwardRef<
  HTMLDivElement,
  RowRendererProps<LyricsKitLyricsLine>
>(({ row, top, absoluteIndex }, ref) => {
  const [springs, api] = useSpring(() => ({
    from: { y: top },
    config: {mass: 0.85, friction: 15, tension: 100},
  }));

  useEffect(() => {
    const old = api.current[0]?.get().y;
    const direction = old > top ? 1 : -1;
    const delay = Math.max(0, absoluteIndex * direction) * 30;
    api.start({ to: { y: top }, delay });
  }, [absoluteIndex, api, top]);

  return (
    <RowContainer
      ref={ref}
      startMs={row.position * 1000}
      endMs={
        (row.attachments?.timeTag?.tags?.length
          ? row.position + row.attachments.timeTag.tags.at(-1).timeTag
          : row.position + 9999) * 1000
      }
      style={{
        ...springs,
      }}
    >
      <LineRenderer line={row} />
      <TranslationContainer startMs={row.position * 1000}>{row.attachments.translation}</TranslationContainer>
    </RowContainer>
  );
});

InnerRowRenderer.displayName = "RowRenderer";

export const RowRenderer = memo(
  InnerRowRenderer,
  (prev, next) => prev.row === next.row && prev.top === next.top
);
