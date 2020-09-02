import { LyricsKitLyrics, LyricsKitLyricsLine } from "../../../graphql/LyricsKitObjects";
import { useAppContext } from "../AppContext";
import { useLyricsState, LyricsFrameCallback } from "../../../frontendUtils/hooks";
import { makeStyles } from "@material-ui/core";
import BalancedText from "react-balance-text-cj";
import _ from "lodash";
import clsx from "clsx";
import { useRef, RefObject, useCallback, useEffect, useMemo } from "react";
import Measure from "react-measure";
import { Scene } from "react-scenejs";
import { cj, notAfter, ascIINonSpace, notBefore, balanceText } from "../../../frontendUtils/balancedTextCJSVG";

const ANIMATION_THRESHOLD = 0.25;

const useStyle = makeStyles((theme) => {
  return {
    container: {
      padding: theme.spacing(4),
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
    },
    line: {
      fontWeight: 600,
      lineHeight: 1.2,
      fontSize: "4em",
      fill: "rgba(255, 255, 255, 0.8)",
      stroke: "rgba(255, 255, 255, 0.8)",
      strokeWidth: 1,
      strokeDasharray: 600,
      strokeDashoffset: 600,
    },
    translation: {
      display: "block",
      fontSize: "2.2em",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundAttachment: "fixed",
      lineHeight: 1.2,
      fontWeight: 600,
      textWrap: "balance",
      color: "rgba(255, 255, 255, 0.6)",
      filter: "var(--jukebox-cover-filter-bright)",
    },
  };
});

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
  className: string;
  translationClassName: string;
  line: LyricsKitLyricsLine | null;
  duration: number;
  width: number;
  progressorRef?: RefObject<Scene>;
}


function LyricsLineElement({ className, line, duration, translationClassName, width, progressorRef }: LyricsLineElementProps) {
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
  }, [line.content]);

  return (
    <div>
      <div lang="ja">
        <Scene keyframes={animate && keyframes} ref={animate && progressorRef}>
          <svg width={width} height="300" style={{ maxWidth: "100%" }} ref={canvasRef}>
            <text x="0" y="1em" id="svgText" lang="ja" className={className} ref={textRef}></text>
          </svg>
        </Scene>
      </div>
      {
        line.attachments?.translation && (
          <div lang="zh" className={translationClassName}>
            {animate ? (
              <BalancedText
                resize={true}>{line.attachments.translation}</BalancedText>
            ) : line.attachments.translation}
          </div>
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

  const progressCallback = useCallback<LyricsFrameCallback>((thisLine, lyrics, player) => {
    if (progressorRef.current) {
      const progressorScene = progressorRef.current;
      if (thisLine >= lyrics.lines.length) {
        progressorScene.setTime("100%");
      } else {
        const time = player.currentTime;
        let endTime = player.duration;
        if (thisLine + 1 < lyrics.lines.length) {
          endTime = lyrics.lines[thisLine + 1].position;
        }
        const percentage = _.clamp((time - lyrics.lines[thisLine].position) / (endTime - lyrics.lines[thisLine].position) / 0.75, 0, 1);
        progressorScene.setTime(`${percentage * 100}%`);
      }
    }
  }, []);

  const line = useLyricsState(playerRef, lyrics, progressCallback);

  const styles = useStyle();

  const lines = lyrics.lines;

  let lineElement: (width: number) => JSX.Element | null = () => null;
  if (line !== null) {
    const start = lines[line].position;
    const end = lines[line + 1]?.position ?? playerRef?.current.duration ?? start + 10;
    lineElement = (width) => (<LyricsLineElement
      className={styles.line}
      translationClassName={clsx(styles.translation, "coverMask")}
      line={lines[line]}
      duration={end - start}
      width={width}
      progressorRef={progressorRef}
    />);
  }

  return (
    <div className={styles.container}>
      <Measure bounds>{
        ({ contentRect, measureRef }) => <div ref={measureRef}>
          {lineElement(contentRect.bounds.width)}
        </div>
      }</Measure>
    </div>
  );
}