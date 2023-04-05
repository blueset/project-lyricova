import type {
  LyricsKitLyrics,
  LyricsKitLyricsLine,
} from "../../../graphql/LyricsKitObjects";
import { useAppContext } from "../AppContext";
import { usePlainPlayerLyricsState } from "../../../frontendUtils/hooks";
import { Box } from "@mui/material";
import Balancer from "react-wrap-balancer";
import type { RefObject} from "react";
import { useRef, useEffect } from "react";
import type { MeasuredComponentProps } from "react-measure";
import Measure from "react-measure";
import { Scene } from "react-scenejs";

const ANIMATION_THRESHOLD = 0.25;

const keyframes: { [key: string]: ((idx: number) => unknown) | unknown } = {
  ".char": (i: number) => ({
    0: {
      "stroke-dashoffset": 600,
      "fill-opacity": 0,
    },
    0.125: {
      "stroke-dashoffset": 300,
      "fill-opacity": 0,
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
    },
  }),
};

/**
 * Measure line wraps in a text node.
 * @author Ben Nadel
 * @source https://www.bennadel.com/blog/4310-detecting-rendered-line-breaks-in-a-text-node-in-javascript.htm
 * @license MIT License
 */
function extractLinesFromTextNode(textNode: Text) {
  if (textNode.nodeType !== 3) {
    throw new Error("Lines can only be extracted from text nodes.");
  }

  // BECAUSE SAFARI: None of the "modern" browsers seem to care about the actual
  // layout of the underlying markup. However, Safari seems to create range
  // rectangles based on the physical structure of the markup (even when it
  // makes no difference in the rendering of the text). As such, let's rewrite
  // the text content of the node to REMOVE SUPERFLUOS WHITE-SPACE. This will
  // allow Safari's .getClientRects() to work like the other modern browsers.
  textNode.textContent = textNode.textContent.trim().replace(/\s+/g, " ");

  // A Range represents a fragment of the document which contains nodes and
  // parts of text nodes. One thing that's really cool about a Range is that we
  // can access the bounding boxes that contain the contents of the Range. By
  // incrementally adding characters - from our text node - into the range, and
  // then looking at the Range's client rectangles, we can determine which
  // characters belong in which rendered line.
  const textContent = textNode.textContent;
  const range = document.createRange();
  const lines: string[][] = [];
  let lineCharacters: string[] = [];

  // Iterate over every character in the text node.
  for (let i = 0; i < textContent.length; i++) {
    // Set the range to span from the beginning of the text node up to and
    // including the current character (offset).
    range.setStart(textNode, 0);
    range.setEnd(textNode, i + 1);

    // At this point, the Range's client rectangles will include a rectangle
    // for each visually-rendered line of text. Which means, the last
    // character in our Range (the current character in our for-loop) will be
    // the last character in the last line of text (in our Range). As such, we
    // can use the current rectangle count to determine the line of text.
    const lineIndex = range.getClientRects().length - 1;

    // If this is the first character in this line, create a new buffer for
    // this line.
    if (!lines[lineIndex]) {
      lines.push((lineCharacters = []));
    }

    // Add this character to the currently pending line of text.
    lineCharacters.push(textContent.charAt(i));
  }

  // At this point, we have an array (lines) of arrays (characters). Let's
  // collapse the character buffers down into a single text value.
  const linesText = lines.map(function operator(characters) {
    return characters.join("").trim().replace(/\s+/g, " ");
  });

  const rects = range.getClientRects();

  return linesText;
}

type RelayoutFn = (wrapper: HTMLElement, ratio: number) => void;
/**
 * Balance line wrapping algorithm
 * @source https://github.com/shuding/react-wrap-balancer/
 * @author Shu Ding
 * @license MIT
 */
export const relayout: RelayoutFn = (wrapper, ratio = 1) => {
  const container = wrapper.parentElement;

  const update = (width: number) => (wrapper.style.maxWidth = width + "px");

  // Reset wrapper width
  wrapper.style.maxWidth = "";

  // Get the initial container size
  const width = container.clientWidth;
  const height = container.clientHeight;

  // Synchronously do binary search and calculate the layout
  let lower: number = width / 2 - 0.25;
  let upper: number = width + 0.5;
  let middle: number;

  if (width) {
    while (lower + 1 < upper) {
      middle = Math.round((lower + upper) / 2);
      update(middle);
      if (container.clientHeight === height) {
        upper = middle;
      } else {
        lower = middle;
      }
    }

    // Update the wrapper width
    update(upper * ratio + width * (1 - ratio));
  }
};


interface LyricsLineElementProps {
  translationClassName: string;
  line: LyricsKitLyricsLine | null;
  duration: number;
  width: number;
  progressorRef?: RefObject<Scene>;
}

function LyricsLineElement({
  line,
  duration,
  translationClassName,
  width,
  progressorRef,
}: LyricsLineElementProps) {
  const textRef = useRef<SVGTextElement>();
  const sizerRef = useRef<HTMLDivElement>();
  const canvasRef = useRef<SVGSVGElement>();
  const animate = duration >= ANIMATION_THRESHOLD;

  useEffect(() => {
    if (textRef.current && sizerRef.current) {
      const sizerSpan = sizerRef.current.querySelector("span");
      sizerSpan.innerText = line?.content ?? "";
      relayout(sizerSpan, 1);
      const lines = sizerSpan.firstChild ? extractLinesFromTextNode(sizerSpan.firstChild as Text) : [];
      const lineHeight = parseFloat(window.getComputedStyle(textRef.current).fontSize) * 1.2;

      // Generate segmented lyrics line
      const segmentedLines = lines.map((line, idx) => `<tspan dy="${idx === 0 ? 0 : lineHeight}" x="0">` + [...line].map(chr => `<tspan class="char">${chr}</tspan>`).join("") + "</tspan>").join("");
      textRef.current.innerHTML = segmentedLines;

      // Resize SVG canvas to fit text
      if (canvasRef.current) {
        const size = textRef.current.getBBox();
        canvasRef.current.width.baseVal.newValueSpecifiedUnits(
          SVGLength.SVG_LENGTHTYPE_PX,
          size.width
        );
        canvasRef.current.height.baseVal.newValueSpecifiedUnits(
          SVGLength.SVG_LENGTHTYPE_PX,
          size.height
        );
      }

      progressorRef.current &&
        progressorRef.current.getItem().load(animate && keyframes);
    }
  }, [animate, line.content, progressorRef, width]);

  return (
    <div>
      <div lang="ja">
        <Box ref={sizerRef} sx={{
          position: "absolute",
          top: 0,
          left: 32,
          right: 32,
          lineHeight: 1,
          fontWeight: 600,
          fontSize: "4em",
          zIndex: -1,
          opacity: 0,
        }}><span style={{display: "inline-block"}} /></Box>
        {/* // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          @ts-ignore */}
        <Scene
          keyframes={animate ? keyframes : null}
          ref={animate ? progressorRef : null}
          autoplay={true}
        >
          <svg
            width={width}
            height="300"
            style={{ maxWidth: "100%" }}
            ref={canvasRef}
          >
            <text
              x="0"
              y="1em"
              id="svgText"
              lang="ja"
              style={{
                fontWeight: 600,
                lineHeight: 1.2,
                fontSize: "4em",
                fill: "rgba(255, 255, 255, 0.8)",
                stroke: "rgba(255, 255, 255, 0.8)",
                strokeWidth: 1,
                strokeDasharray: 600,
                strokeDashoffset: 600,
              }}
              ref={textRef}
            ></text>
          </svg>
        </Scene>
      </div>
      {line.attachments?.translation && (
        <Box
          lang="zh"
          className={translationClassName}
          sx={{
            display: "block",
            fontSize: "2.2em",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundAttachment: "fixed",
            lineHeight: 1.2,
            fontWeight: 600,
            color: "rgba(255, 255, 255, 0.6)",
            filter: "var(--jukebox-cover-filter-bright)",
          }}
        >
          <Balancer>{line.attachments.translation}</Balancer>
        </Box>
      )}
    </div>
  );
}

interface Props {
  lyrics: LyricsKitLyrics;
}

export function StrokeLyrics({ lyrics }: Props) {
  const { playerRef } = useAppContext();
  const progressorRef = useRef<Scene>();

  const {
    currentFrame,
    currentFrameId,
    endTime,
    playerState,
  } = usePlainPlayerLyricsState(lyrics, playerRef);

  useEffect(() => {
    if (!progressorRef.current) return;
    const progressorScene = progressorRef.current;
    if (currentFrameId >= lyrics.lines.length) {
      progressorScene.setTime("100%");
    } else {
      const now = performance.now();
      const startTime = currentFrame?.start ?? 0;
      if (playerState.state === "playing") {
        const inlineProgress =
          (now - playerState.startingAt) / 1000 - startTime;
        progressorScene.setTime(inlineProgress);
        progressorScene.play();
      } else {
        const inlineProgress = playerState.progress - startTime;
        progressorScene.pause();
        progressorScene.setTime(inlineProgress);
      }
    }
    // Player progress is not included to prevent animation loop.
  }, [playerState.state, currentFrame, currentFrameId, lyrics.lines.length]);

  let lineElement: (width: number) => JSX.Element | null = () => null;
  if (currentFrame !== null) {
    const start = currentFrame.start;
    const end = endTime;
    lineElement = (width) => (
      <LyricsLineElement
        translationClassName={"coverMask"}
        line={currentFrame.data}
        duration={end - start}
        width={width}
        progressorRef={progressorRef}
      />
    );
  }

  return (
    <Box
      sx={{
        padding: 4,
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <Measure bounds>
        {({ contentRect, measureRef }: MeasuredComponentProps) => (
          <div ref={measureRef}>{lineElement(contentRect.bounds.width)}</div>
        )}
      </Measure>
    </Box>
  );
}
