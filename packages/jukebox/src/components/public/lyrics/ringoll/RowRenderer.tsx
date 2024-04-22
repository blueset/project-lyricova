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
  (props: { start: number; end: number }) => ({
    // const RowContainer = styled("div")((props: { start: number; end: number }) => ({
    // opacity: `calc(${calcIfInBetween(
    //   "lyrics-time",
    //   props.start - 0.5,
    //   props.end + 0.5,
    //   1,
    //   0.5
    // )})`,
    opacity: `calc(1 - sign(var(--lyrics-time) - ${props.end}) * 0.5)`,
    position: "absolute",
    fontSize: "2em",
    willChange: "translate, opacity",
    transition: "opacity 0.2s, translate 0.5s ease-out",
    minHeight: "0.5em",
    paddingBlockEnd: "1rem",
  })
);

const InnerRowRenderer = forwardRef<
  HTMLDivElement,
  RowRendererProps<LyricsKitLyricsLine>
>(({ row, top, absoluteIndex }, ref) => {
  const [springs, api] = useSpring(() => ({
    from: { y: top },
    config: {mass: 0.85, friction: 15, tension: 100},
  }));

  useEffect(() => {
    api.start({ to: { y: top }, delay: Math.max(0, absoluteIndex) * 30 });
  }, [absoluteIndex, api, top]);

  return (
    <RowContainer
      ref={ref}
      start={row.position * 1000}
      end={
        (row.attachments?.timeTag?.tags?.length
          ? row.position + row.attachments.timeTag.tags.at(-1).timeTag
          : row.position + 9999) * 1000
      }
      style={{
        // translate: `0 ${top}px`,
        // transitionDelay: `${Math.max(0, absoluteIndex) * 0.02}s`,
        ...springs,
      }}
    >
      {/* {row.content} */}
      <LineRenderer line={row} />
      <div style={{ fontSize: "0.625em" }}>{row.attachments.translation}</div>
    </RowContainer>
  );
});

InnerRowRenderer.displayName = "RowRenderer";

export const RowRenderer = memo(
  InnerRowRenderer,
  (prev, next) => prev.row === next.row && prev.top === next.top
);
