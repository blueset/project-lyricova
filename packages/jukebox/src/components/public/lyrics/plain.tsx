import type { LyricsKitLyrics } from "../../../graphql/LyricsKitObjects";
import { useAppContext } from "../AppContext";
import { useLyricsState } from "../../../frontendUtils/hooks";
import { styled } from "@mui/material";
import { CSSProperties, memo } from "react";
import { useRef, useEffect } from "react";
import clsx from "clsx";
import Balancer from "react-wrap-balancer";
import FuriganaLyricsLine from "../../FuriganaLyricsLine";
import React from "react";

const ANIMATION_THRESHOLD = 0.25;
const MemoBalanceText = React.memo(Balancer);

interface Props {
  lyrics: LyricsKitLyrics;
}

const StyledLine = styled("div")({
  fontWeight: 400,
  opacity: 0.7,
  minHeight: "1.2em",
  fontSize: "1.5em",
  textAlign: "center",
  paddingTop: 16,
  "&.active": {
    opacity: 1,
    fontWeight: 600,
  },
  "& .translation": {
    fontSize: "0.8em",
  },
});

function Line({
  lineObj,
  active,
  idx,
}: {
  lineObj: LyricsKitLyrics["lines"][0];
  active: boolean;
  idx: number;
}) {
  return (
    <StyledLine data-index={idx} className={clsx(active && "active")}>
      <MemoBalanceText>
        <FuriganaLyricsLine graphQLSourceLine={lineObj} />
      </MemoBalanceText>
      {lineObj.attachments.translation && (
        <div className="translation">
          <MemoBalanceText>{lineObj.attachments.translation}</MemoBalanceText>
        </div>
      )}
    </StyledLine>
  );
}

const LineMemo = memo(
  Line,
  (prev, next) =>
    prev.lineObj === next.lineObj &&
    prev.active === next.active &&
    prev.idx === next.idx
);

const StyledContainer = styled("div")`
  padding: 4;
  width: 100%;
  height: 100%;
  overflow: hidden;
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

const Spacer = styled("div")`
  height: 50vh;
`;

export function PlainLyrics({ lyrics }: Props) {
  const { playerRef } = useAppContext();
  const { lines } = lyrics;
  const line = useLyricsState(playerRef, lyrics);
  const container = useRef<HTMLDivElement>();

  useEffect(() => {
    const lines = lyrics.lines;
    const animate =
      lines &&
      line !== null &&
      (line + 1 > lines.length ||
        !lines[line + 1] ||
        lines[line + 1].position - lines[line].position >= ANIMATION_THRESHOLD);
    if (container.current) {
      container.current
        .querySelector(`[data-index="${line}"]`)
        ?.scrollIntoView({
          block: "center",
          behavior: animate ? "smooth" : "auto",
        });
    }
  }, [container, line, lyrics.lines]);

  return (
    <StyledContainer ref={container}>
      <Spacer />
      {lines.map((lineObj, idx) => (
        <LineMemo key={idx} idx={idx} lineObj={lineObj} active={idx === line} />
      ))}
      <Spacer />
    </StyledContainer>
  );
}
