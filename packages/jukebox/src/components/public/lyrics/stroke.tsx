import { LyricsKitLyrics, LyricsKitLyricsLine } from "../../../graphql/LyricsKitObjects";
import { useAppContext } from "../AppContext";
import {
  useLyricsState,
  LyricsFrameCallback,
  usePlayerLyricsState,
  usePlainPlayerLyricsState
} from "../../../frontendUtils/hooks";
import { Box, makeStyles } from "@mui/material";
import BalancedText from "react-balance-text-cj";
import _ from "lodash";
import clsx from "clsx";
import { useRef, RefObject, useCallback, useEffect, useMemo } from "react";
import Measure from "react-measure";
import { Scene } from "react-scenejs";
import { cj, notAfter, ascIINonSpace, notBefore, balanceText } from "../../../frontendUtils/balancedTextCJSVG";

const ANIMATION_THRESHOLD = 0.25;

const keyframes: { [key: string]: ((idx: number) => unknown) | unknown; } = {
  ".char": (i: number) => ({
    0: {
      "stroke-dashoffset": 600,
      "fill-opacity": 0
    },
    0.125: {
      "stroke-dashoffset": 300,
      "fill-opacity": 0
    },
    0.25: {
      "stroke-dashoffset": 0,
      "fill-opacity": 0.5,
      "stroke-opacity": 1,
    },
    0.275: {
      "stroke-dashoffset": 0,
      "fill-opacity": 1,
      "stroke-opacity": 0,
    },
    options: {
      delay: 0.1 * i,
    }
  })
};

interface LyricsLineElementProps {
  translationClassName: string;
  line: LyricsKitLyricsLine | null;
  duration: number;
  width: number;
  progressorRef?: RefObject<Scene>;
}


function LyricsLineElement({ line, duration, translationClassName, width, progressorRef }: LyricsLineElementProps) {
  const textRef = useRef<SVGTextElement>();
  const canvasRef = useRef<SVGSVGElement>();
  const animate = duration >= ANIMATION_THRESHOLD;

  useEffect(() => {
    if (textRef.current) {
      // Generate segmented lyrics line
      const segmentedLine = [...line.content].map((v, idx, arr) => {
        if (v === " ") v = "\u00A0"; // NBSP
        const charNode = `<tspan class="char">${v}</tspan>`;
        const next = arr[idx + 1];
        if (v === "\u00A0" || (next !== undefined && (
          (new RegExp(`[${cj}${notBefore}]`, "u").test(v) && new RegExp(`[^${notBefore}]`, "u").test(next)) ||
          (new RegExp(`[${ascIINonSpace}]`, "u").test(v) && new RegExp(`[${cj}${notAfter}]`, "u").test(next))
        ))) {
          return `${charNode}\u200B`;
        } else {
          return charNode;
        }
      }).join("");
      textRef.current.innerHTML = segmentedLine;

      // Reflow text
      balanceText(textRef.current, width, 1.2);

      // Resize SVG canvas to fit text
      if (canvasRef.current) {
        const size = textRef.current.getBBox();
        canvasRef.current.width.baseVal.newValueSpecifiedUnits(SVGLength.SVG_LENGTHTYPE_PX, size.width);
        canvasRef.current.height.baseVal.newValueSpecifiedUnits(SVGLength.SVG_LENGTHTYPE_PX, size.height);
      }

      progressorRef.current && progressorRef.current.getItem().load(animate && keyframes);
    }
  }, [animate, line.content, progressorRef, width]);

  return (
    <div>
      <div lang="ja">
        <Scene keyframes={animate ? keyframes : null} ref={animate ? progressorRef : null} autoplay={true}>
          <svg width={width} height="300" style={{ maxWidth: "100%" }} ref={canvasRef}>
            <text x="0" y="1em" id="svgText" lang="ja" style={{
              fontWeight: 600,
              lineHeight: 1.2,
              fontSize: "4em",
              fill: "rgba(255, 255, 255, 0.8)",
              stroke: "rgba(255, 255, 255, 0.8)",
              strokeWidth: 1,
              strokeDasharray: 600,
              strokeDashoffset: 600,
            }} ref={textRef}></text>
          </svg>
        </Scene>
      </div>
      {
        line.attachments?.translation && (
          <Box lang="zh" className={translationClassName} sx={{
            display: "block",
            fontSize: "2.2em",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundAttachment: "fixed",
            lineHeight: 1.2,
            fontWeight: 600,
            color: "rgba(255, 255, 255, 0.6)",
            filter: "var(--jukebox-cover-filter-bright)",
          }}>
            {animate ? (
              <BalancedText
                resize={true}>{line.attachments.translation}</BalancedText>
            ) : line.attachments.translation}
          </Box>
        )
      }
    </div>
  );
}

interface Props {
  lyrics: LyricsKitLyrics;
}

export function StrokeLyrics({ lyrics }: Props) {
  const { playerRef } = useAppContext();
  const progressorRef = useRef<Scene>();

  const {currentFrame, currentFrameId, endTime, playerState} = usePlainPlayerLyricsState(lyrics, playerRef);

  useEffect(() => {
    if (!progressorRef.current) return;
    const progressorScene = progressorRef.current;
    if (currentFrameId >= lyrics.lines.length) {
      progressorScene.setTime("100%");
    } else {
      const now = performance.now();
      const startTime = currentFrame?.start ?? 0;
      if (playerState.state === "playing") {
        const inlineProgress = (now - playerState.startingAt) / 1000 - startTime;
        progressorScene.setTime(inlineProgress);
        progressorScene.play();
      } else {
        const inlineProgress = playerState.progress - startTime;
        progressorScene.pause();
        progressorScene.setTime(inlineProgress);
      }
    }
  }, [playerState, progressorRef.current, currentFrame]);

  let lineElement: (width: number) => JSX.Element | null = () => null;
  if (currentFrame !== null) {
    const start = currentFrame.start;
    const end = endTime;
    lineElement = (width) => (<LyricsLineElement
      translationClassName={"coverMask"}
      line={currentFrame.data}
      duration={end - start}
      width={width}
      progressorRef={progressorRef}
    />);
  }

  return (
    <Box sx={{
      padding: 4,
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
    }}>
      <Measure bounds>{
        ({ contentRect, measureRef }) => <div ref={measureRef}>
          {lineElement(contentRect.bounds.width)}
        </div>
      }</Measure>
    </Box>
  );
}