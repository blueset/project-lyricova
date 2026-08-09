import { describe, expect, it } from "vitest";
import type {
  GlyphOutline,
  PositionedGlyph,
  ShapedCluster,
} from "@lyricova/glyph-renderer";
import {
  apply,
  IDENTITY,
  multiply,
  type Affine,
  type Point,
} from "../glyph/canvasGlyphGeometry";
import type { GlyphCanvasContext } from "../glyph/canvasGlyphRenderer";
import {
  GlyphPathCache,
  type CanvasPathReceiver,
} from "../glyph/glyphOutlineCache";
import { clusterFill } from "../glyph/karaokeTiming";
import {
  buildClusters,
  buildLine,
  makeSourceRange,
} from "../glyph/testFixtures";
import type {
  LinePlacement,
  NormalizedFuriganaAnnotation,
  PositionedRubyGlyph,
  RubyPlacement,
  RubyRun,
  RubyLayoutResult,
} from "../glyph/types";
import {
  BASE_FLOAT_RISE_EM,
  BASE_FLOAT_RISE_MINOR_EM,
  BOB_AMPLITUDE_EM,
  baseFloatOffsetEm,
  charEmphasis,
  emphasisBobOffsetEm,
  emphasisParams,
} from "./emphasis";
import {
  GLOW_COLOR,
  SUNG_ALPHA,
  SUNG_COLOR,
  SWEEP_FADE_RATIO,
  UNSUNG_ALPHA,
  UNSUNG_COLOR,
  INACTIVE_LINE_ALPHA,
  buildContinuousSweepFronts,
  buildWordContexts,
  lineFloatDescentEndTime,
  lineRevealedOffset,
  lineTransientAnimationEndTime,
  paintLine,
  resolveClusterStyle,
  rubyRevealFraction,
  sweepFadeWidth,
  type ClusterWordContext,
  type LinePaintOptions,
} from "./linePainter";
import type { LyricWord } from "./wordModel";
import { buildWords, leadingRevealEnd } from "./wordModel";

// --- Recording canvas (mirrors canvasGlyphRenderer.spec.ts) ----------------

let pathCounter = 0;
class FakePath implements CanvasPathReceiver {
  readonly id = pathCounter++;
  moveTo(): void {}
  lineTo(): void {}
  quadraticCurveTo(): void {}
  bezierCurveTo(): void {}
  closePath(): void {}
}

class FakeGradient implements CanvasGradient {
  readonly stops: { offset: number; color: string }[] = [];
  addColorStop(offset: number, color: string): void {
    this.stops.push({ offset, color });
  }
}

interface FillRecord {
  pathId: number;
  fillStyle: string | CanvasGradient | CanvasPattern;
  alpha: number;
  origin: Point;
}

/**
 * A `GlyphCanvasContext` that accumulates the transform stack (like a real
 * canvas) so fills can be checked in absolute space, and records fills, rects,
 * clips and the save/restore balance for assertions.
 */
class RecordingContext implements GlyphCanvasContext {
  globalAlpha = 1;
  fillStyle: string | CanvasGradient | CanvasPattern = "#000000";
  shadowBlur = 0;
  shadowColor = "rgba(0, 0, 0, 0)";
  globalCompositeOperation = "source-over";
  private current: Affine = IDENTITY;
  private readonly stack: {
    matrix: Affine;
    alpha: number;
    fillStyle: string | CanvasGradient | CanvasPattern;
    shadowBlur: number;
    shadowColor: string;
    composite: string;
  }[] = [];
  readonly fills: FillRecord[] = [];
  gradientCount = 0;
  rectCount = 0;
  clipCount = 0;
  maxDepth = 0;

  save(): void {
    this.stack.push({
      matrix: this.current,
      alpha: this.globalAlpha,
      fillStyle: this.fillStyle,
      shadowBlur: this.shadowBlur,
      shadowColor: this.shadowColor,
      composite: this.globalCompositeOperation,
    });
    this.maxDepth = Math.max(this.maxDepth, this.stack.length);
  }
  restore(): void {
    const state = this.stack.pop();
    if (state) {
      this.current = state.matrix;
      this.globalAlpha = state.alpha;
      this.fillStyle = state.fillStyle;
      this.shadowBlur = state.shadowBlur;
      this.shadowColor = state.shadowColor;
      this.globalCompositeOperation = state.composite;
    }
  }
  get depth(): number {
    return this.stack.length;
  }
  transform(
    a: number,
    b: number,
    c: number,
    d: number,
    e: number,
    f: number,
  ): void {
    this.current = multiply(this.current, [a, b, c, d, e, f]);
  }
  beginPath(): void {}
  rect(): void {
    this.rectCount += 1;
  }
  clip(): void {
    this.clipCount += 1;
  }
  createLinearGradient(): CanvasGradient {
    this.gradientCount += 1;
    return new FakeGradient();
  }
  fill(path: Path2D): void {
    this.fills.push({
      pathId: (path as unknown as FakePath).id,
      fillStyle: this.fillStyle,
      alpha: this.globalAlpha,
      origin: apply(this.current, { x: 0, y: 0 }),
    });
  }
}

// --- Fixtures --------------------------------------------------------------

function glyph(glyphId: number, xAdvance: number): PositionedGlyph {
  return {
    glyphId,
    fontId: 0,
    cluster: 0,
    clusterEnd: 0,
    clusterUtf16: 0,
    clusterEndUtf16: 0,
    xAdvance,
    yAdvance: 0,
    xOffset: 0,
    yOffset: 0,
  };
}

/** Attaches one drawable glyph (id derived from position) to every
 * non-whitespace cluster so `drawCluster` actually paints. */
function withGlyphs(clusters: readonly ShapedCluster[]): ShapedCluster[] {
  return clusters.map((cluster, index) =>
    cluster.isWhitespace
      ? cluster
      : { ...cluster, glyphs: [glyph(100 + index, cluster.advance)] },
  );
}

/** A cache whose lookup returns a stub outline for every glyph except id 0. */
function makeCache(): GlyphPathCache {
  const lookup = (_fontId: number, glyphId: number): GlyphOutline | null => {
    if (glyphId === 0) return null;
    return {
      commands: [{ type: "moveTo", x: 0, y: 0 }],
      bounds: { xMin: 0, xMax: 10, yMin: 0, yMax: 16 },
      unitsPerEm: 1000,
      fontSize: 20,
      scale: 0.02,
    };
  };
  return new GlyphPathCache({
    lookup,
    createPath2D: () =>
      new FakePath() as unknown as Path2D & CanvasPathReceiver,
  });
}

/** Wraps one laid-out line into a single-line `RubyLayoutResult`. */
function wrapLayout(
  line: ReturnType<typeof buildLine>,
  opts: {
    contentOffsetX?: number;
    occupiedWidth?: number;
    rubies?: RubyPlacement[];
  } = {},
): RubyLayoutResult {
  const placement: LinePlacement = {
    lineIndex: 0,
    line,
    top: line.top,
    baseline: line.baseline,
    height: line.height,
    contentOffsetX: opts.contentOffsetX ?? 0,
    occupiedWidth: opts.occupiedWidth ?? line.width,
    rubies: opts.rubies ?? [],
  };
  return {
    lines: [placement],
    height: line.height,
    width: placement.occupiedWidth,
    baseDirection: "ltr",
    rubyRow: { height: 0, baseline: 0, fontSize: 0 },
    rubyMetrics: null,
    naturalRubyMetrics: null,
    rubies: placement.rubies,
    issues: [],
    missingFontRanges: [],
  };
}

const FONT_SIZE = 20;

// --- Tests -----------------------------------------------------------------

describe("sweep constants", () => {
  it("uses AMLL's sung/unsung alphas", () => {
    expect(SUNG_ALPHA).toBe(1);
    expect(UNSUNG_ALPHA).toBe(0.4);
    expect(SUNG_COLOR).toBe("rgba(255, 255, 255, 1)");
    expect(UNSUNG_COLOR).toBe("rgba(255, 255, 255, 0.4)");
  });

  it("leaves an inactive line at its unsung colour, unlike AMLL", () => {
    // The review asks a future line to read as the *same* colour as the
    // not-yet-sung portion of the active line, so the reveal looks like one
    // boundary sweeping down the page. AMLL's extra 0.2 line dim would have
    // put a future line at 0.4 x 0.2 = 0.08 alpha on top of Ringoll's own
    // depth blur and passed-line opacity - illegible.
    expect(INACTIVE_LINE_ALPHA).toBe(1);
    expect(UNSUNG_ALPHA * INACTIVE_LINE_ALPHA).toBe(UNSUNG_ALPHA);
  });

  it("derives the soft band width from the font size", () => {
    expect(SWEEP_FADE_RATIO).toBe(0.5);
    expect(sweepFadeWidth(40)).toBe(20);
    expect(sweepFadeWidth(24)).toBe(12);
  });
});

describe("lineRevealedOffset", () => {
  it("reveals an untimed line all at once at its authored start", () => {
    const params = {
      words: [] as LyricWord[],
      contentLength: 10,
      startTime: 0,
      endTime: 10,
    };
    expect(lineRevealedOffset({ ...params, time: -1 })).toBe(0);
    expect(lineRevealedOffset({ ...params, time: 0 })).toBe(10);
    expect(lineRevealedOffset({ ...params, time: 5 })).toBe(10);
    expect(lineRevealedOffset({ ...params, time: 20 })).toBe(10);
  });

  it("interpolates the front across the active word of a timed line", () => {
    const words: LyricWord[] = [
      {
        index: 0,
        utf16Range: [0, 3],
        startTime: 0,
        endTime: 1,
        duration: 1,
        isLast: false,
      },
      {
        index: 1,
        utf16Range: [3, 6],
        startTime: 1,
        endTime: 2,
        duration: 1,
        isLast: true,
      },
    ];
    const base = { words, contentLength: 6, startTime: 0, endTime: 2 };
    // Mid first word: 0 + 0.5 * (3 - 0).
    expect(lineRevealedOffset({ ...base, time: 0.5 })).toBeCloseTo(1.5, 6);
    // Word boundary: first word finished, second not started.
    expect(lineRevealedOffset({ ...base, time: 1 })).toBeCloseTo(3, 6);
    // Mid second word: 3 + 0.5 * (6 - 3).
    expect(lineRevealedOffset({ ...base, time: 1.5 })).toBeCloseTo(4.5, 6);
    // After the last word: full content length.
    expect(lineRevealedOffset({ ...base, time: 5 })).toBeCloseTo(6, 6);
    // Before the first word: nothing revealed.
    expect(lineRevealedOffset({ ...base, time: -1 })).toBe(0);
  });

  it("holds the front through an inter-word gap", () => {
    const words: LyricWord[] = [
      {
        index: 0,
        utf16Range: [0, 3],
        startTime: 0,
        endTime: 1,
        duration: 1,
        isLast: false,
      },
      {
        index: 1,
        utf16Range: [3, 6],
        startTime: 2,
        endTime: 3,
        duration: 1,
        isLast: true,
      },
    ];
    // In the 1s..2s gap the front holds at the first word's right edge.
    expect(
      lineRevealedOffset({
        words,
        contentLength: 6,
        startTime: 0,
        endTime: 3,
        time: 1.5,
      }),
    ).toBeCloseTo(3, 6);
  });

  it("reveals a prefix at line start before sweeping the first tagged word", () => {
    const tags = [{ index: 2, time: 12 }];
    const words = buildWords(tags, 4, 14);
    const params = {
      words,
      contentLength: 4,
      startTime: 10,
      endTime: 14,
      leadingRevealEnd: leadingRevealEnd(tags, 4),
    };

    expect(lineRevealedOffset({ ...params, time: 9.999 })).toBe(0);
    expect(lineRevealedOffset({ ...params, time: 10 })).toBe(2);
    expect(lineRevealedOffset({ ...params, time: 11.999 })).toBe(2);
    expect(lineRevealedOffset({ ...params, time: 12 })).toBe(2);
    expect(lineRevealedOffset({ ...params, time: 13 })).toBeCloseTo(3, 6);
    expect(lineRevealedOffset({ ...params, time: 14 })).toBe(4);
  });

  it("advances monotonically for words derived by buildWords", () => {
    const words = buildWords(
      [
        { index: 2, time: 0 },
        { index: 4, time: 1 },
      ],
      6,
      2,
    );
    const base = { words, contentLength: 6, startTime: 0, endTime: 2 };
    const early = lineRevealedOffset({ ...base, time: 0.5 });
    const late = lineRevealedOffset({ ...base, time: 1.5 });
    expect(late).toBeGreaterThan(early);
  });
});

describe("lineTransientAnimationEndTime", () => {
  it("keeps the sample ECHO glow alive after its authored line end", () => {
    const words = buildWords(
      [
        { index: 0, time: 55.149 },
        { index: 1, time: 55.556 },
        { index: 4, time: 61.912 },
      ],
      4,
      61.912,
    );

    const animationEnd = lineTransientAnimationEndTime(words, "ECHO");

    expect(animationEnd).toBeGreaterThan(61.912);
    expect(animationEnd).toBeCloseTo(67.868, 5);
  });

  it("has no transient tail when no word qualifies for emphasis", () => {
    const words = buildWords(
      [
        { index: 0, time: 0 },
        { index: 1, time: 0.5 },
      ],
      2,
      1,
    );
    expect(lineTransientAnimationEndTime(words, "AB")).toBe(
      Number.NEGATIVE_INFINITY,
    );
  });
});

describe("lineFloatDescentEndTime", () => {
  it("waits for the longest current float clock to reverse to zero", () => {
    const words: LyricWord[] = [
      {
        index: 0,
        utf16Range: [0, 2],
        startTime: 0,
        endTime: 2,
        duration: 2,
        isLast: false,
      },
      {
        index: 1,
        utf16Range: [2, 4],
        startTime: 2,
        endTime: 2.5,
        duration: 0.5,
        isLast: true,
      },
    ];
    expect(lineFloatDescentEndTime(words, 3)).toBe(5);
  });

  it("returns no tail for an untimed line", () => {
    expect(lineFloatDescentEndTime([], 3)).toBe(Number.NEGATIVE_INFINITY);
  });
});

describe("resolveClusterStyle", () => {
  const cluster = buildClusters([{ char: "a", advance: 10 }])[0];
  const fadeWidth = sweepFadeWidth(FONT_SIZE);

  it("always emits the soft karaoke sweep for a cluster with no word", () => {
    const style = resolveClusterStyle({
      cluster,
      revealed: 0.5,
      fadeWidth,
      fontSize: FONT_SIZE,
      timeMs: 0,
      minor: false,
      activeColor: SUNG_COLOR,
      inactiveColor: UNSUNG_COLOR,
      word: null,
    });
    expect(style.fillFraction).toBeCloseTo(clusterFill(0.5, 0, 1), 6);
    expect(style.softEdgeWidth).toBe(fadeWidth);
    expect(style.fillDirection).toBe("ltr");
    expect(style.activeColor).toBe(SUNG_COLOR);
    expect(style.inactiveColor).toBe(UNSUNG_COLOR);
    // No word -> no motion and no glow.
    expect(style.transform).toBeUndefined();
    expect(style.glow).toBeUndefined();
  });

  it("clamps the fill fraction to the reveal front", () => {
    const at = (revealed: number) =>
      resolveClusterStyle({
        cluster,
        revealed,
        fadeWidth,
        fontSize: FONT_SIZE,
        timeMs: 0,
        minor: false,
        activeColor: SUNG_COLOR,
        inactiveColor: UNSUNG_COLOR,
        word: null,
      }).fillFraction;
    expect(at(0)).toBe(0);
    expect(at(1)).toBe(1);
    expect(at(5)).toBe(1);
  });

  it("fills right-to-left for an rtl cluster", () => {
    const style = resolveClusterStyle({
      cluster: {
        source: makeSourceRange(0, 1),
        direction: "rtl",
        isWhitespace: false,
      },
      revealed: 0,
      fadeWidth,
      fontSize: FONT_SIZE,
      timeMs: 0,
      minor: false,
      activeColor: SUNG_COLOR,
      inactiveColor: UNSUNG_COLOR,
      word: null,
    });
    expect(style.fillDirection).toBe("rtl");
  });

  const emphasizedWord: LyricWord = {
    index: 0,
    utf16Range: [0, 5],
    startTime: 1,
    endTime: 3,
    duration: 2,
    isLast: false,
  };
  const emphasizedContext: ClusterWordContext = {
    word: emphasizedWord,
    charIndex: 0,
    charCount: 5,
    emphasized: true,
    params: emphasisParams(2000, false),
  };

  it("sums base float, emphasis lift and bob into one vertical translate", () => {
    const timeMs = 2000;
    const style = resolveClusterStyle({
      cluster,
      revealed: 0.5,
      fadeWidth,
      fontSize: FONT_SIZE,
      timeMs,
      minor: false,
      activeColor: SUNG_COLOR,
      inactiveColor: UNSUNG_COLOR,
      word: emphasizedContext,
    });

    const wordStartMs = 1000;
    const wordDurationMs = 2000;
    const floatEm = baseFloatOffsetEm(timeMs, wordStartMs, wordDurationMs, {
      amplitudeEm: BASE_FLOAT_RISE_EM,
    });
    const emphasis = charEmphasis(
      emphasizedContext.params,
      0,
      5,
      timeMs,
      wordStartMs,
    );
    const bobEm = emphasisBobOffsetEm(
      emphasizedContext.params,
      timeMs,
      wordStartMs,
      {
        amplitudeEm: BOB_AMPLITUDE_EM,
        charIndex: emphasizedContext.charIndex,
        charCount: emphasizedContext.charCount,
      },
    );

    // Every vertical contribution is genuinely non-zero at this instant, so a
    // sum is the only way to reach the asserted value (nothing is masking).
    expect(floatEm).not.toBe(0);
    expect(emphasis.offsetYEm).not.toBe(0);
    expect(bobEm).not.toBe(0);

    const expectedY = (floatEm + emphasis.offsetYEm + bobEm) * FONT_SIZE;
    expect(style.transform?.translate?.y).toBeCloseTo(expectedY, 6);
    expect(style.transform?.translate?.x).toBeCloseTo(
      emphasis.offsetXEm * FONT_SIZE,
      6,
    );
    expect(style.transform?.scale).toBeCloseTo(emphasis.scale, 6);
  });

  it("maps the emphasis glow to a white halo scaled by font size", () => {
    const timeMs = 2000;
    const style = resolveClusterStyle({
      cluster,
      revealed: 0.5,
      fadeWidth,
      fontSize: FONT_SIZE,
      timeMs,
      minor: false,
      activeColor: SUNG_COLOR,
      inactiveColor: UNSUNG_COLOR,
      word: emphasizedContext,
    });
    const emphasis = charEmphasis(emphasizedContext.params, 0, 5, timeMs, 1000);
    expect(emphasis.glowAlpha).toBeGreaterThan(0);
    expect(style.glow?.color).toBe(GLOW_COLOR);
    expect(style.glow?.alpha).toBeCloseTo(emphasis.glowAlpha, 6);
    expect(style.glow?.blur).toBeCloseTo(emphasis.glowRadiusEm * FONT_SIZE, 6);
  });

  it("applies no emphasis (scale/glow) to a non-qualifying word, only float", () => {
    const plainWord: LyricWord = {
      index: 0,
      utf16Range: [0, 5],
      startTime: 1,
      endTime: 1.5,
      duration: 0.5,
      isLast: false,
    };
    const context: ClusterWordContext = {
      word: plainWord,
      charIndex: 0,
      charCount: 3,
      emphasized: false,
      params: emphasisParams(500, false),
    };
    const timeMs = 1500;
    const style = resolveClusterStyle({
      cluster,
      revealed: 0,
      fadeWidth,
      fontSize: FONT_SIZE,
      timeMs,
      minor: false,
      activeColor: SUNG_COLOR,
      inactiveColor: UNSUNG_COLOR,
      word: context,
    });
    const floatEm = baseFloatOffsetEm(timeMs, 1000, 500, {
      amplitudeEm: BASE_FLOAT_RISE_EM,
    });
    expect(style.transform?.translate?.y).toBeCloseTo(floatEm * FONT_SIZE, 6);
    expect(style.transform?.scale).toBeUndefined();
    expect(style.glow).toBeUndefined();
  });

  it("reverses the persistent float after line deactivation", () => {
    const plainWord: LyricWord = {
      index: 0,
      utf16Range: [0, 5],
      startTime: 1,
      endTime: 2,
      duration: 1,
      isLast: true,
    };
    const context: ClusterWordContext = {
      word: plainWord,
      charIndex: 0,
      charCount: 3,
      emphasized: false,
      params: emphasisParams(1000, true),
    };
    const style = resolveClusterStyle({
      cluster,
      revealed: 5,
      fadeWidth,
      fontSize: FONT_SIZE,
      timeMs: 2500,
      floatReverseStartMs: 2000,
      minor: false,
      activeColor: SUNG_COLOR,
      inactiveColor: UNSUNG_COLOR,
      word: context,
    });
    const expected = baseFloatOffsetEm(2500, 1000, 1000, {
      reverseStartMs: 2000,
    });
    expect(style.transform?.translate?.y).toBeCloseTo(expected * FONT_SIZE, 6);
  });

  it("doubles the float amplitude on a minor line", () => {
    const plainWord: LyricWord = {
      index: 0,
      utf16Range: [0, 5],
      startTime: 1,
      endTime: 1.5,
      duration: 0.5,
      isLast: false,
    };
    const context = (): ClusterWordContext => ({
      word: plainWord,
      charIndex: 0,
      charCount: 3,
      emphasized: false,
      params: emphasisParams(500, false),
    });
    const common = {
      cluster,
      revealed: 0,
      fadeWidth,
      fontSize: FONT_SIZE,
      timeMs: 1500,
      activeColor: SUNG_COLOR,
      inactiveColor: UNSUNG_COLOR,
    };
    const normal = resolveClusterStyle({
      ...common,
      minor: false,
      word: context(),
    });
    const minor = resolveClusterStyle({
      ...common,
      minor: true,
      word: context(),
    });
    // BASE_FLOAT_RISE_MINOR_EM === 2 * BASE_FLOAT_RISE_EM.
    expect(BASE_FLOAT_RISE_MINOR_EM).toBeCloseTo(2 * BASE_FLOAT_RISE_EM, 6);
    expect(minor.transform?.translate?.y).toBeCloseTo(
      2 * (normal.transform?.translate?.y ?? 0),
      6,
    );
  });
});

describe("buildWordContexts", () => {
  const chars = "hello world".split("").map((char) => ({
    char,
    advance: char === " " ? 4 : 10,
  }));
  const clusters = buildClusters(chars);
  const layout = wrapLayout(buildLine(clusters));
  const words: LyricWord[] = [
    {
      index: 0,
      utf16Range: [0, 5],
      startTime: 0,
      endTime: 2,
      duration: 2,
      isLast: false,
    },
    {
      index: 1,
      utf16Range: [6, 11],
      startTime: 2,
      endTime: 2.5,
      duration: 0.5,
      isLast: true,
    },
  ];
  const contexts = buildWordContexts(layout, "hello world", words);

  it("assigns a logical char index and count per word", () => {
    expect(contexts.get(clusters[0])).toMatchObject({
      charIndex: 0,
      charCount: 5,
    });
    expect(contexts.get(clusters[4])).toMatchObject({
      charIndex: 4,
      charCount: 5,
    });
    expect(contexts.get(clusters[6])).toMatchObject({
      charIndex: 0,
      charCount: 5,
    });
    expect(contexts.get(clusters[10])).toMatchObject({
      charIndex: 4,
      charCount: 5,
    });
  });

  it("marks only the qualifying (long, in-window) word as emphasized", () => {
    // "hello" lasts 2s and is 5 chars -> emphasized; "world" lasts 0.5s -> not.
    expect(contexts.get(clusters[0])?.emphasized).toBe(true);
    expect(contexts.get(clusters[6])?.emphasized).toBe(false);
  });

  it("excludes whitespace clusters from any word", () => {
    expect(contexts.get(clusters[5])).toBeUndefined();
  });
});

describe("buildContinuousSweepFronts", () => {
  const clusters = buildClusters([
    { char: "a", advance: 10 },
    { char: "b", advance: 30 },
  ]);
  const layout = wrapLayout(buildLine(clusters));

  it("places both sides of a shared boundary under the same sweep band", () => {
    const fronts = buildContinuousSweepFronts(layout, 1, 2, 8);
    expect(fronts.get(clusters[0])).toBeCloseTo(10, 6);
    expect(fronts.get(clusters[1])).toBeCloseTo(0, 6);
  });

  it("keeps the whole line unsung and sung at its outer endpoints", () => {
    const start = buildContinuousSweepFronts(layout, 0, 2, 8);
    expect(start.get(clusters[0])).toBeCloseTo(-4, 6);

    const end = buildContinuousSweepFronts(layout, 2, 2, 8);
    expect(end.get(clusters[1])).toBeCloseTo(34, 6);
  });

  it("moves continuously away from the extended line endpoints", () => {
    const start = buildContinuousSweepFronts(layout, 0, 2, 8);
    const justAfterStart = buildContinuousSweepFronts(layout, 0.001, 2, 8);
    expect(
      Math.abs(
        (justAfterStart.get(clusters[0]) ?? 0) - (start.get(clusters[0]) ?? 0),
      ),
    ).toBeLessThan(0.1);

    const justBeforeEnd = buildContinuousSweepFronts(layout, 1.999, 2, 8);
    const end = buildContinuousSweepFronts(layout, 2, 2, 8);
    expect(
      Math.abs(
        (end.get(clusters[1]) ?? 0) - (justBeforeEnd.get(clusters[1]) ?? 0),
      ),
    ).toBeLessThan(0.1);
  });

  it("maps an rtl cluster from its reading-start edge to its reading-end edge", () => {
    const rtlClusters = buildClusters([
      { char: "א", advance: 12 },
      { char: "b", advance: 10 },
    ]);
    rtlClusters[0] = { ...rtlClusters[0]!, direction: "rtl" };
    const rtlLayout = wrapLayout(buildLine(rtlClusters));
    const fronts = buildContinuousSweepFronts(rtlLayout, 1, 2, 8);
    expect(fronts.get(rtlClusters[0])).toBeCloseTo(0, 6);
    expect(fronts.get(rtlClusters[1])).toBeCloseTo(0, 6);
  });
});

describe("rubyRevealFraction", () => {
  it("tracks the annotation's base UTF-16 range", () => {
    const ruby = {
      annotation: { utf16Range: [2, 5] as const },
    } as RubyPlacement;
    expect(rubyRevealFraction(ruby, 2)).toBe(0);
    expect(rubyRevealFraction(ruby, 3.5)).toBeCloseTo(0.5, 6);
    expect(rubyRevealFraction(ruby, 5)).toBe(1);
    expect(rubyRevealFraction(ruby, 2)).toBe(clusterFill(2, 2, 5));
  });
});

describe("paintLine", () => {
  const clusters = withGlyphs(
    buildClusters([
      { char: "h", advance: 10 },
      { char: "i", advance: 10 },
    ]),
  );
  const line = buildLine(clusters, { top: 0, ascent: 16, descent: 4 });
  const words: LyricWord[] = [
    {
      index: 0,
      utf16Range: [0, 2],
      startTime: 0,
      endTime: 0.5,
      duration: 0.5,
      isLast: true,
    },
  ];

  const baseOptions = (
    overrides: Partial<LinePaintOptions> = {},
  ): LinePaintOptions => ({
    layout: wrapLayout(line),
    content: "hi",
    words,
    time: 0.25,
    startTime: 0,
    endTime: 0.5,
    leadingRevealEnd: 0,
    fontSize: FONT_SIZE,
    minor: false,
    lineAlpha: 1,
    activeColor: SUNG_COLOR,
    inactiveColor: UNSUNG_COLOR,
    alignment: "start",
    contentWidth: line.width,
    variations: ["wght=600"],
    ...overrides,
  });

  it("paints an inactive pass and a soft-edge sung pass, balancing save/restore", () => {
    const ctx = new RecordingContext();
    paintLine(ctx, baseOptions(), makeCache());

    expect(ctx.fills.length).toBeGreaterThan(0);
    // Every cluster gets an unsung base pass.
    expect(ctx.fills.some((f) => f.fillStyle === UNSUNG_COLOR)).toBe(true);
    // Both sides of the shared boundary paint one continuous soft band.
    expect(ctx.gradientCount).toBe(2);
    // paintLine leaves the stack exactly as it found it.
    expect(ctx.depth).toBe(0);
  });

  it("shifts each row by its alignment offset", () => {
    const originX = (
      alignment: LinePaintOptions["alignment"],
      contentWidth: number,
    ) => {
      const ctx = new RecordingContext();
      paintLine(ctx, baseOptions({ alignment, contentWidth }), makeCache());
      return (
        ctx.fills.find((f) => f.fillStyle === UNSUNG_COLOR)?.origin.x ?? NaN
      );
    };
    const startX = originX("start", line.width);
    // Slack of 40 -> centre offset of 20.
    const centerX = originX("center", line.width + 40);
    expect(centerX - startX).toBeCloseTo(20, 6);
  });

  it("composes the line alpha into every fill", () => {
    const ctx = new RecordingContext();
    paintLine(ctx, baseOptions({ lineAlpha: 0.2 }), makeCache());
    const inactive = ctx.fills.filter((f) => f.fillStyle === UNSUNG_COLOR);
    expect(inactive.length).toBeGreaterThan(0);
    for (const fill of inactive) expect(fill.alpha).toBeCloseTo(0.2, 6);
  });

  it("paints ruby runs revealed in step with their base range", () => {
    const rubyGlyph: PositionedRubyGlyph = { ...glyph(200, 6), x: 0 };
    const run: RubyRun = {
      contentRange: [0, 1],
      glyphs: [rubyGlyph],
      width: 6,
      x: 2,
    };
    const annotation = {
      content: "か",
      utf16Range: [0, 2],
      graphemeRange: [0, 1],
      sourceIndex: 0,
    } as NormalizedFuriganaAnnotation;
    const ruby: RubyPlacement = {
      annotation,
      mode: "group",
      lineIndex: 0,
      baseX: [0, 20],
      y: -12,
      inkAscent: 8,
      inkDescent: 0,
      inkLeft: 0,
      inkRight: 6,
      fontSize: 10,
      fontIds: [0],
      runs: [run],
    };
    const ctx = new RecordingContext();
    paintLine(
      ctx,
      baseOptions({ layout: wrapLayout(line, { rubies: [ruby] }) }),
      makeCache(),
    );

    // The ruby baseline sits at lineTop + ruby.y = -12; its glyphs paint there.
    const rubyFills = ctx.fills.filter(
      (f) => Math.abs(f.origin.y - -12) < 1e-6,
    );
    // At time 0.25 the base range [0,2] is half revealed, so the ruby paints an
    // inactive pass plus a clipped sung pass.
    expect(rubyFills.length).toBeGreaterThanOrEqual(2);
    expect(rubyFills.some((f) => f.fillStyle === UNSUNG_COLOR)).toBe(true);
    expect(rubyFills.some((f) => f.fillStyle === SUNG_COLOR)).toBe(true);
    expect(ctx.clipCount).toBeGreaterThan(0);
  });

  it("fully reveals ruby without a clip once its base range is sung", () => {
    const rubyGlyph: PositionedRubyGlyph = { ...glyph(200, 6), x: 0 };
    const run: RubyRun = {
      contentRange: [0, 1],
      glyphs: [rubyGlyph],
      width: 6,
      x: 2,
    };
    const annotation = {
      content: "か",
      utf16Range: [0, 2],
      graphemeRange: [0, 1],
      sourceIndex: 0,
    } as NormalizedFuriganaAnnotation;
    const ruby: RubyPlacement = {
      annotation,
      mode: "group",
      lineIndex: 0,
      baseX: [0, 20],
      y: -12,
      inkAscent: 8,
      inkDescent: 0,
      inkLeft: 0,
      inkRight: 6,
      fontSize: 10,
      fontIds: [0],
      runs: [run],
    };
    const ctx = new RecordingContext();
    paintLine(
      ctx,
      baseOptions({
        // time past endTime -> fully revealed.
        time: 1,
        layout: wrapLayout(line, { rubies: [ruby] }),
      }),
      makeCache(),
    );
    const rubyFills = ctx.fills.filter(
      (f) => Math.abs(f.origin.y - -12) < 1e-6,
    );
    expect(rubyFills.some((f) => f.fillStyle === SUNG_COLOR)).toBe(true);
    expect(ctx.clipCount).toBe(0);
  });
});
