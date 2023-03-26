import { Entry } from "lyricova-common/models/Entry";
import type { Verse } from "lyricova-common/models/Verse";
import { GetServerSideProps } from "next";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TagRow } from "../../components/public/TagRow";
import { generateColorGradientFunction } from "../../frontendUtils/colors";
import { relayout } from "../../frontendUtils/relayout";
import {
  ScreensaverProps,
  getServerSideProps as getProps,
} from "../../utils/screensaverProps";
import classes from "./glucagon.module.scss";

export const getServerSideProps: GetServerSideProps<ScreensaverProps> =
  getProps;

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

  return linesText.map<[string, DOMRect]>((s, idx) => [s, rects[idx]]);
}

class Particle {
  static height = 5;
  static width = 3;

  destX: number;
  destY: number;
  srcY: number;
  exitY: number;
  x: number;
  y: number;
  color: string;
  amplitude: number;
  wavelength: number;
  startTime: number;

  upStartTime: number;
  upDuration: number;

  static exitStartTime = 6000;
  exitDuration: number;

  active = true;

  constructor(x: number, y: number, color: string) {
    y = y + Math.random() - 0.5;
    x = x + Math.random() - 0.5;
    this.destX = x;
    this.destY = y;
    this.x = x;
    this.y = window.innerHeight + Particle.height + 10;
    this.srcY = window.innerHeight + Particle.height + 10;
    this.exitY = -Particle.height - 10;
    this.color = color;
    this.amplitude = 1 + Math.random() * 10;
    this.wavelength = 15 + Math.random() * 10;

    this.startTime = performance.now();
    this.upDuration = 500 + Math.random() * 2000;
    this.upStartTime = (5500 - this.upDuration) * Math.random();
    this.exitDuration = 500 + Math.random() * 500;
  }

  render(ctx: CanvasRenderingContext2D, time: number) {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(
        this.x,
        this.y,
        Particle.width,
        Particle.height,
        Particle.width / 2
      );
    } else {
      ctx.ellipse(
        this.x + Particle.width / 2,
        this.y + Particle.height / 2,
        Particle.width / 2,
        Particle.height / 2,
        0,
        0,
        2 * Math.PI
      );
    }
    ctx.fill();
    time -= this.startTime;
    if (time < this.upStartTime) {
      this.y = this.srcY;
      this.x = this.destX;
    } else if (
      time > this.upStartTime &&
      time < this.upStartTime + this.upDuration
    ) {
      const progress = (time - this.upStartTime) / this.upDuration;
      const displacement = (this.destY - this.srcY) * progress;
      this.y = this.srcY + displacement;
      this.x =
        this.destX + this.amplitude * Math.sin(displacement / this.wavelength);
    } else if (
      time > Particle.exitStartTime &&
      time < Particle.exitStartTime + this.exitDuration
    ) {
      const progress = (time - Particle.exitStartTime) / this.exitDuration;
      const displacement = (this.exitY - this.destY) * progress;
      this.y = this.destY + displacement;
      this.x =
        this.destX + this.amplitude * Math.sin(displacement / this.wavelength);
    } else if (time >= Particle.exitStartTime + this.exitDuration) {
      this.y = this.exitY;
      this.x = this.destX;
      // destroy particle
      this.active = false;
    } else {
      this.y = this.destY;
      this.x = this.destX;
    }
  }
}

class Glucagon {
  canvas: HTMLCanvasElement;
  backCanvas: HTMLCanvasElement;
  sizer: HTMLSpanElement;
  ctx: CanvasRenderingContext2D;
  backCtx: CanvasRenderingContext2D;
  animiationFrame: number;

  verseIndex = -1;
  lineIndex = 0;

  verses: Verse[];
  verseLines: string[][];
  entries: Record<number, Entry>;
  onNewVerse?: (entryId: number) => void;

  particles: Particle[] = [];
  gradient = (pos: number) => "rgba(0,255,0,0.5)";

  lastLineTime = 0;

  constructor(
    canvas: HTMLCanvasElement,
    sizer: HTMLSpanElement,
    backCanvas: HTMLCanvasElement,
    verses: Verse[],
    entries: Record<number, Entry>,
    onNewVerse?: (entryId: number) => void
  ) {
    this.canvas = canvas;
    this.backCanvas = backCanvas;

    this.sizer = sizer;
    this.ctx = canvas.getContext("2d");
    this.backCtx = this.backCanvas.getContext("2d", {
      willReadFrequently: true,
    });

    this.resize();
    this.register();

    this.verses = verses;
    this.entries = entries;
    this.verseLines = verses.map((v) =>
      v.text
        .replace(/——/g, "⸺")
        .replace(/\p{Zs}/gu, " ")
        .split("\n")
        .map((l) => l.trim())
        .filter((v) => v)
    );
    this.onNewVerse = onNewVerse;

    this.animiationFrame = requestAnimationFrame(
      this.renderParticles.bind(this)
    );
  }

  register() {
    if (typeof window !== undefined) {
      window.addEventListener("resize", this.resize.bind(this));
    }
  }

  unregister() {
    if (typeof window !== undefined) {
      window.removeEventListener("resize", this.resize.bind(this));
      if (this.animiationFrame) cancelAnimationFrame(this.animiationFrame);
    }
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.backCanvas.width = this.canvas.width;
    this.backCanvas.height = this.canvas.height;
  }

  bumpLine() {
    if (
      this.verseIndex < 0 ||
      this.lineIndex + 1 >= this.verseLines[this.verseIndex].length
    ) {
      this.verseIndex = (this.verseIndex + 1) % this.verseLines.length;
      this.onNewVerse?.(this.verses[this.verseIndex].entryId);
      this.gradient = generateColorGradientFunction(
        this.entries[this.verses[this.verseIndex].entryId].tags
      );
      this.lineIndex = -1;
    }
    this.lineIndex++;
    const text = this.verseLines[this.verseIndex][this.lineIndex];
    this.renderText(text);
  }

  async renderText(text: string) {
    const fontSize = 90;
    this.sizer.style.fontSize = `${fontSize}px`;
    this.sizer.innerText = text;
    relayout(this.sizer, 1);
    const lines = extractLinesFromTextNode(this.sizer.firstChild as Text);
    // console.log(lines);
    if (lines.length < 1) return;

    let fontFamily = "sans-serif";
    if (typeof document !== "undefined") {
      const fontFamilies: string[] = [];
      document.fonts.forEach(
        (f) =>
          f.family.match(/(Mona|SourceHan)/g) && fontFamilies.push(f.family)
      );
      if (fontFamilies) fontFamily = fontFamilies.join(", ");
    }

    const { width, height } = this.canvas;
    this.backCtx.clearRect(0, 0, width, height);
    this.backCtx.font = `50 ${fontSize}px ${fontFamily}`;
    this.backCtx.fillStyle = "white";

    let left = Infinity,
      top = Infinity;
    let right = -Infinity,
      bottom = -Infinity;

    lines.forEach(([text, rect]) => {
      // if (rect) this.backCtx.fillText(text, rect.left, rect.top + rect.height);
      if (rect) {
        const metrics = this.backCtx.measureText(text);
        const currLeft = rect.left - (rect.left % 3);
        const currBottom = rect.top + rect.height;
        left = Math.min(left, currLeft);
        top = Math.min(top, currBottom - metrics.actualBoundingBoxAscent);
        right = Math.max(right, currLeft + metrics.width);
        bottom = Math.max(
          bottom,
          currBottom + metrics.actualBoundingBoxDescent
        );
        this.backCtx.fillText(text, currLeft, currBottom);
      }
    });

    left = Math.floor(left);
    top = Math.floor(top);
    right = Math.ceil(right);
    bottom = Math.ceil(bottom);

    const image = this.backCtx.getImageData(
      left,
      top,
      right - left,
      bottom - top
    );
    const data = image.data;

    this.placeParticles(data, left, top, right, bottom);
  }

  getPixelAlpha(data: Uint8ClampedArray, x: number, y: number, width: number) {
    return data[(x + y * width) * 4 + 3];
  }

  placeParticles(
    data: Uint8ClampedArray,
    left: number,
    top: number,
    right: number,
    bottom: number
  ) {
    // console.log("ltrb", left, top, right, bottom);
    const { width, height } = this.canvas;
    const { width: pWidth, height: pHeight } = Particle;

    for (let x = 0; x < right - left; x += pWidth) {
      let color: string | null = null;
      for (let y = 0; y < bottom - top; ) {
        // const alpha = Math.max(
        //   ...[...Array(pWidth).keys()].map((i) =>
        //     this.getPixelAlpha(data, x + i, y, width)
        //   )
        // );
        const alpha =
          [...Array(pWidth).keys()]
            .map((i) => this.getPixelAlpha(data, x + i, y, right - left))
            .reduce((a, b) => a + b) / pWidth;
        color = color || this.gradient((left + x) / width);
        if (alpha > 0x5f) {
          this.particles.push(new Particle(left + x, top + y, color));
          y += pHeight;
        } else {
          y++;
        }
      }
    }
  }

  renderParticles(time: number) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.particles.forEach((p) => p.render(this.ctx, time));
    if (this.lastLineTime + 5500 < performance.now()) {
      this.lastLineTime = performance.now();
      this.bumpLine();
      this.particles = this.particles.filter((p) => p.active);
    }
    this.animiationFrame = requestAnimationFrame(
      this.renderParticles.bind(this)
    );
  }
}

export default function GlucagonScreensaver({
  entries,
  verses,
}: ScreensaverProps) {
  const canvasRef = useRef<HTMLCanvasElement>();
  const backUpCanvasRef = useRef<HTMLCanvasElement>();
  const sizerRef = useRef<HTMLSpanElement>();

  const [[h, m, s], setTime] = useState(["00", "00", "00"]);
  const [entryId, setEntryId] = useState(1);
  const entry = entries[entryId];
  const artistString = !entry
    ? "Unknown artists"
    : !entry.producersName
    ? entry.vocalistsName
    : !entry.vocalistsName
    ? entry.producersName
    : `${entry.producersName} feat. ${entry.vocalistsName}`;

  useEffect(() => {
    const now = new Date();
    setTime([
      now.getHours().toString().padStart(2, "0"),
      now.getMinutes().toString().padStart(2, "0"),
      now.getSeconds().toString().padStart(2, "0"),
    ]);
    const timer = setInterval(() => {
      const now = new Date();
      setTime([
        now.getHours().toString().padStart(2, "0"),
        now.getMinutes().toString().padStart(2, "0"),
        now.getSeconds().toString().padStart(2, "0"),
      ]);
    }, 1000);
    return () => {
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (canvasRef.current && sizerRef.current && backUpCanvasRef.current) {
      const glucagon = new Glucagon(
        canvasRef.current,
        sizerRef.current,
        backUpCanvasRef.current,
        verses,
        entries,
        setEntryId
      );
      glucagon.bumpLine();
      glucagon.lastLineTime = performance.now();
      return () => {
        glucagon.unregister();
      };
    }
  }, [verses]);

  return (
    <>
      <div className={classes.metaRow}>
        <div className={classes.meta}>
          <span className={classes.title}>
            {entry?.title ?? "Unknown track"}
          </span>
          <span className={classes.artists}>{artistString}</span>
          <TagRow tags={entry?.tags ?? []} />
        </div>

        <div className={classes.headerTime}>
          {h}
          <span className={classes.colon}>:</span>
          {m}
          <span className={classes.colon}>:</span>
          {s}
        </div>
      </div>
      <div className={classes.credit}>
        <span>Project Lyricova Screensaver Gen 5</span>
        <span>
          <a href="https://www.youtube.com/watch?v=0Q_b_W4qjis">Glucagon</a>{" "}
          originally by EZFG, 2015
        </span>
      </div>
      <div className={classes.sizerContainer}>
        <div className={classes.sizer}>
          <span ref={sizerRef}></span>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        width={100}
        height={100}
        style={{
          width: "fit-content",
          height: "fit-content",
        }}
      />
      <canvas
        ref={backUpCanvasRef}
        id="backupCanvas"
        className={classes.backupCanvas}
      />
    </>
  );
}
