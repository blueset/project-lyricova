import { StrictMode, useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

import { readPlaybackSnapshot, useMediaClock } from "@/hooks/useMediaClock";
import type { PlaybackSnapshot } from "@/hooks/types";
import {
  lineBreakOpportunities,
  type ParagraphLayout,
} from "@lyricova/glyph-renderer";
import { drawCluster } from "@/components/public/lyrics/glyph/canvasGlyphRenderer";
import type {
  ClusterRenderStyle,
  GlyphCanvasContext,
} from "@/components/public/lyrics/glyph/canvasGlyphRenderer";
import type { ClusterTransform } from "@/components/public/lyrics/glyph/canvasGlyphGeometry";
import type { GlyphPathCache } from "@/components/public/lyrics/glyph/glyphOutlineCache";
import {
  clusterFill,
  revealedOffset,
  validateRevealTags,
  KaraokeTimingError,
  type RevealTag,
} from "@/components/public/lyrics/glyph/karaokeTiming";
import {
  clusterEntrance,
  clusterEntranceProgress,
} from "@/components/public/lyrics/glyph/clusterAnimation";
import { layoutRubyParagraph } from "@/components/public/lyrics/glyph/rubyLayout";
import { autoPhraseRanges } from "@/components/public/lyrics/glyph/autoPhrase";
import { wrapCanvasText } from "@/components/public/lyrics/glyph/canvasTextWrap";
import type { FuriganaAnnotationInput } from "@/components/public/lyrics/glyph/types";
import {
  ensureFonts,
  ensureRuntime,
  getShaper,
  LIGHT_CHAIN,
  loadChainViaProductionLoader,
  newCache,
  payloads,
  prepareText,
  summarizeCluster,
  summarizeLayout,
  type LayoutSummary,
} from "./glyphEngine";

// ---------------------------------------------------------------------------
// Imperative test API (window.__glyph): drives the real WASM shaper + Canvas2D
// Path2D renderer for the shaping/rendering/error specs.
// ---------------------------------------------------------------------------

let probeCanvas: HTMLCanvasElement | null = null;

const DEFAULT_INACTIVE = "#0040ff"; // blue
const DEFAULT_ACTIVE = "#ff2000"; // red

interface RenderSpec {
  text: string;
  fontChain?: readonly string[];
  fontSize?: number;
  maxWidth?: number | null;
  wrapStrategy?: "greedy" | "balanced";
  phraseRanges?: [number, number][];
  features?: string[];
  variations?: string[];
  baseDirection?: "ltr" | "rtl" | "auto";
  language?: string | null;
  script?: string | null;
  width?: number;
  height?: number;
  originX?: number;
  baseline?: number;
  inactiveColor?: string;
  activeColor?: string;
  fillFraction?: number;
  fills?: Record<number, number>;
  transforms?: Record<number, ClusterTransform>;
  opacities?: Record<number, number>;
  clear?: boolean;
  /** Solid background painted after clearing (e.g. for stable screenshots). */
  background?: string;
}

interface RenderResult {
  layout: LayoutSummary;
  originX: number;
  baseline: number;
  cache: { hits: number; misses: number };
}

let probeCache: GlyphPathCache | null = null;
function probeCacheInstance(): GlyphPathCache {
  return (probeCache ??= newCache());
}

function prepareCanvas(spec: RenderSpec): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
} {
  const canvas = probeCanvas!;
  const width = spec.width ?? 360;
  const height = spec.height ?? 160;
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  if (spec.clear !== false) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (spec.background) {
      ctx.fillStyle = spec.background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }
  return { canvas, ctx };
}

async function render(spec: RenderSpec): Promise<RenderResult> {
  const fontChain = spec.fontChain ?? LIGHT_CHAIN;
  const fontIds = await ensureFonts(fontChain);
  const fontSize = spec.fontSize ?? 48;
  const shaper = getShaper();
  const layout = shaper.layoutParagraph({
    text: spec.text,
    fontIds,
    fontSize,
    maxWidth: spec.maxWidth ?? null,
    wrapStrategy: spec.wrapStrategy,
    phraseRanges: spec.phraseRanges,
    features: spec.features,
    variations: spec.variations,
    baseDirection: spec.baseDirection,
    language: spec.language ?? undefined,
    script: spec.script ?? undefined,
  });
  const line = layout.lines[0]!;
  const { ctx } = prepareCanvas(spec);
  const originX = spec.originX ?? 8;
  const baseline = spec.baseline ?? fontSize + 8;
  ctx.setTransform(1, 0, 0, 1, originX, baseline - line.baseline);

  const cache = probeCacheInstance();
  const inactiveColor = spec.inactiveColor ?? DEFAULT_INACTIVE;
  const activeColor = spec.activeColor ?? DEFAULT_ACTIVE;

  line.clusters.forEach((cluster, i) => {
    const style: ClusterRenderStyle = {
      inactiveColor,
      activeColor,
      fillFraction: spec.fills?.[i] ?? spec.fillFraction ?? 0,
      opacity: spec.opacities?.[i],
      transform: spec.transforms?.[i],
    };
    drawCluster(
      ctx as unknown as GlyphCanvasContext,
      cluster,
      line,
      style,
      { cache, fontSize, variations: spec.variations },
      1,
    );
  });

  return {
    layout: summarizeLayout(layout),
    originX,
    baseline,
    cache: cache.stats,
  };
}

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [0, 0, 0];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

interface AnalyzeOptions {
  activeColor?: string;
  inactiveColor?: string;
  alphaThreshold?: number;
}

interface AnalyzeResult {
  ink: number;
  active: number;
  inactive: number;
  bbox: { minX: number; minY: number; maxX: number; maxY: number } | null;
  halves: {
    leftActive: number;
    leftInactive: number;
    rightActive: number;
    rightInactive: number;
  };
}

function analyze(opts: AnalyzeOptions = {}): AnalyzeResult {
  const canvas = probeCanvas!;
  const ctx = canvas.getContext("2d")!;
  const active = hexToRgb(opts.activeColor ?? DEFAULT_ACTIVE);
  const inactive = hexToRgb(opts.inactiveColor ?? DEFAULT_INACTIVE);
  const alphaThreshold = opts.alphaThreshold ?? 128;
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;

  let ink = 0;
  let activeCount = 0;
  let inactiveCount = 0;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const inkPixels: { x: number; y: number; isActive: boolean }[] = [];

  const dist = (r: number, g: number, b: number, c: number[]) =>
    (r - c[0]) ** 2 + (g - c[1]) ** 2 + (b - c[2]) ** 2;

  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const idx = (y * canvas.width + x) * 4;
      if (d[idx + 3] < alphaThreshold) continue;
      const r = d[idx];
      const g = d[idx + 1];
      const b = d[idx + 2];
      const isActive = dist(r, g, b, active) <= dist(r, g, b, inactive);
      ink += 1;
      if (isActive) activeCount += 1;
      else inactiveCount += 1;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      inkPixels.push({ x, y, isActive });
    }
  }

  const bbox = ink > 0 ? { minX, minY, maxX, maxY } : null;
  const centerX = bbox ? (bbox.minX + bbox.maxX) / 2 : 0;
  let leftActive = 0;
  let leftInactive = 0;
  let rightActive = 0;
  let rightInactive = 0;
  for (const p of inkPixels) {
    if (p.x < centerX) {
      if (p.isActive) leftActive += 1;
      else leftInactive += 1;
    } else {
      if (p.isActive) rightActive += 1;
      else rightInactive += 1;
    }
  }

  return {
    ink,
    active: activeCount,
    inactive: inactiveCount,
    bbox,
    halves: { leftActive, leftInactive, rightActive, rightInactive },
  };
}

/** Ink bounding box over an x column range [x0, x1) of the probe canvas. */
function measureInk(
  x0: number,
  x1: number,
  alphaThreshold = 128,
): { count: number; minY: number; maxY: number; minX: number; maxX: number } {
  const canvas = probeCanvas!;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  let count = 0;
  let minY = Infinity;
  let maxY = -Infinity;
  let minX = Infinity;
  let maxX = -Infinity;
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = Math.max(0, x0); x < Math.min(canvas.width, x1); x += 1) {
      const idx = (y * canvas.width + x) * 4;
      if (d[idx + 3] < alphaThreshold) continue;
      count += 1;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
    }
  }
  return { count, minY, maxY, minX, maxX };
}

interface BenchmarkResult {
  frames: number;
  totalMs: number;
  avgMs: number;
  maxFrameMs: number;
  shapeCalls: number;
  hitsAfterFirst: number;
  missesAfterFirst: number;
  hitsFinal: number;
  missesFinal: number;
}

async function benchmark(
  spec: RenderSpec & { frames?: number },
): Promise<BenchmarkResult> {
  const frames = spec.frames ?? 120;
  const fontChain = spec.fontChain ?? LIGHT_CHAIN;
  const fontIds = await ensureFonts(fontChain);
  const fontSize = spec.fontSize ?? 44;
  const shaper = getShaper();

  // Single shaping/layout up front; every frame is a pure redraw.
  let shapeCalls = 0;
  shapeCalls += 1;
  const layout = shaper.layoutParagraph({
    text: spec.text,
    fontIds,
    fontSize,
    maxWidth: spec.maxWidth ?? null,
  });
  const line = layout.lines[0]!;
  const { canvas, ctx } = prepareCanvas(spec);
  const originX = spec.originX ?? 8;
  const baseline = spec.baseline ?? fontSize + 8;
  const cache = newCache(); // fresh cache so miss->hit transition is observable

  let hitsAfterFirst = 0;
  let missesAfterFirst = 0;
  let maxFrameMs = 0;
  const start = performance.now();
  for (let f = 0; f < frames; f += 1) {
    const frameStart = performance.now();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(1, 0, 0, 1, originX, baseline - line.baseline);
    const fraction = frames <= 1 ? 1 : f / (frames - 1);
    line.clusters.forEach((cluster) => {
      drawCluster(
        ctx as unknown as GlyphCanvasContext,
        cluster,
        line,
        {
          inactiveColor: DEFAULT_INACTIVE,
          activeColor: DEFAULT_ACTIVE,
          fillFraction: fraction,
        },
        { cache, fontSize },
        1,
      );
    });
    const frameMs = performance.now() - frameStart;
    if (frameMs > maxFrameMs) maxFrameMs = frameMs;
    if (f === 0) {
      hitsAfterFirst = cache.stats.hits;
      missesAfterFirst = cache.stats.misses;
    }
  }
  const totalMs = performance.now() - start;

  return {
    frames,
    totalMs,
    avgMs: totalMs / frames,
    maxFrameMs,
    shapeCalls,
    hitsAfterFirst,
    missesAfterFirst,
    hitsFinal: cache.stats.hits,
    missesFinal: cache.stats.misses,
  };
}

interface RubySummary {
  issues: string[];
  height: number;
  width: number;
  rubies: {
    mode: string;
    lineIndex: number;
    baseX: [number, number];
    y: number;
    inkAscent: number;
    inkDescent: number;
    fontSize: number;
    runCount: number;
    glyphCount: number;
  }[];
  lines: {
    top: number;
    baseline: number;
    height: number;
    lineBoxHeight: number;
  }[];
}

async function ruby(req: {
  text: string;
  furigana: FuriganaAnnotationInput[];
  fontChain?: readonly string[];
  rubyFontChain?: readonly string[];
  fontSize?: number;
  maxWidth?: number | null;
}): Promise<RubySummary> {
  const fontIds = await ensureFonts(
    req.fontChain ?? ["source-han-sans-vf-otf"],
  );
  const rubyFontIds = req.rubyFontChain
    ? await ensureFonts(req.rubyFontChain)
    : undefined;
  const result = layoutRubyParagraph(getShaper(), {
    text: req.text,
    furigana: req.furigana,
    fontIds,
    rubyFontIds,
    fontSize: req.fontSize ?? 32,
    maxWidth: req.maxWidth ?? null,
    language: "ja",
    onInvalidAnnotation: "skip",
  });
  return {
    issues: result.issues.map((i) => i.kind),
    height: result.height,
    width: result.width,
    rubies: result.rubies.map((r) => ({
      mode: r.mode,
      lineIndex: r.lineIndex,
      baseX: [r.baseX[0], r.baseX[1]],
      y: r.y,
      inkAscent: r.inkAscent,
      inkDescent: r.inkDescent,
      fontSize: r.fontSize,
      runCount: r.runs.length,
      glyphCount: r.runs.reduce((s, run) => s + run.glyphs.length, 0),
    })),
    lines: result.lines.map((l) => ({
      top: l.top,
      baseline: l.baseline,
      height: l.height,
      lineBoxHeight: l.line.height,
    })),
  };
}

interface ErrorReport {
  ok: boolean;
  errorName: string | null;
  message: string | null;
  status?: number;
  fontManifestId?: string;
}

async function tryBadFont(
  kind: "unknown-id" | "not-a-font" | "missing-route",
): Promise<ErrorReport> {
  try {
    if (kind === "unknown-id") {
      await loadChainViaProductionLoader(["definitely-not-a-real-font"]);
    } else if (kind === "not-a-font") {
      const { loadGlyphFonts } =
        await import("@/components/public/lyrics/glyph/fontLoader");
      await ensureRuntime();
      await loadGlyphFonts({
        fontManifestIds: ["mona-sans-latin-otf"],
        fetchImpl: async () =>
          new Response(new Uint8Array([0xde, 0xad, 0xbe, 0xef]), {
            status: 200,
          }),
      });
    } else {
      const { loadGlyphFonts } =
        await import("@/components/public/lyrics/glyph/fontLoader");
      await loadGlyphFonts({
        fontManifestIds: ["mona-sans-latin-otf"],
        baseUrl: "/no-such-font-route",
        fetchImpl: fetch,
      });
    }
    return { ok: true, errorName: null, message: null };
  } catch (error) {
    const err = error as {
      name?: string;
      message?: string;
      status?: number;
      fontManifestId?: string;
    };
    return {
      ok: false,
      errorName: err.name ?? "Error",
      message: err.message ?? String(error),
      status: err.status,
      fontManifestId: err.fontManifestId,
    };
  }
}

function validateTiming(tags: RevealTag[], contentLength: number): ErrorReport {
  try {
    validateRevealTags(tags, contentLength);
    return { ok: true, errorName: null, message: null };
  } catch (error) {
    return {
      ok: false,
      errorName: error instanceof KaraokeTimingError ? error.name : "Error",
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

async function layout(
  text: string,
  opts: {
    fontChain?: readonly string[];
    fontSize?: number;
    maxWidth?: number | null;
    wrapStrategy?: "greedy" | "balanced";
    phraseRanges?: [number, number][];
    features?: string[];
    variations?: string[];
    baseDirection?: "ltr" | "rtl" | "auto";
    language?: string | null;
    script?: string | null;
  } = {},
): Promise<LayoutSummary> {
  const fontIds = await ensureFonts(opts.fontChain ?? LIGHT_CHAIN);
  const result = getShaper().layoutParagraph({
    text,
    fontIds,
    fontSize: opts.fontSize ?? 40,
    maxWidth: opts.maxWidth ?? null,
    wrapStrategy: opts.wrapStrategy,
    phraseRanges: opts.phraseRanges,
    features: opts.features,
    variations: opts.variations,
    baseDirection: opts.baseDirection,
    language: opts.language ?? undefined,
    script: opts.script ?? undefined,
  });
  return summarizeLayout(result);
}

async function wrapTranslation(
  text: string,
  maxWidth: number,
  language?: string | null,
) {
  await ensureRuntime();
  const ctx = probeCanvas!.getContext("2d")!;
  ctx.font = "20px ui-sans-serif, system-ui, sans-serif";
  return wrapCanvasText({
    text,
    maxWidth,
    lineHeight: 28,
    measureText: (value) => ctx.measureText(value).width,
    breaks: lineBreakOpportunities(text),
    wrapStrategy: "balanced",
    phraseRanges: autoPhraseRanges(text, { language }).phraseRanges,
  });
}

const GLYPH_API = {
  ready: async (chain?: readonly string[]) => {
    await ensureFonts(chain ?? LIGHT_CHAIN);
    return { status: "ready" as const };
  },
  payloads,
  prepareText,
  autoPhrase: (text: string, language?: string | null) =>
    autoPhraseRanges(text, { language }),
  wrapTranslation,
  layout,
  ruby,
  render,
  analyze,
  measureInk,
  benchmark,
  loadChainViaProductionLoader,
  tryBadFont,
  validateTiming,
  resetProbeCache: () => {
    probeCache?.clear();
    probeCache = null;
  },
  summarizeClusterAt: async (
    text: string,
    index: number,
    chain?: readonly string[],
  ) => {
    const fontIds = await ensureFonts(chain ?? LIGHT_CHAIN);
    const l = getShaper().layoutParagraph({ text, fontIds, fontSize: 40 });
    const c = l.lines[0]?.clusters[index];
    return c ? summarizeCluster(c) : null;
  },
};

export type GlyphApi = typeof GLYPH_API;

// ---------------------------------------------------------------------------
// React lifecycle harness: fake media element + useMediaClock driving a real
// glyph canvas. Exercises pause/seek/rate/late-readiness through the shared
// media-clock seam and proves shaping happens only on layout inputs.
// ---------------------------------------------------------------------------

const LC_TEXT = "hello world";
const LC_FONT_SIZE = 40;
const LC_DURATION = 10;
const LC_INACTIVE = "rgba(255,255,255,0.35)";
const LC_ACTIVE = "rgba(255,255,255,0.98)";

function setText(ref: React.RefObject<HTMLElement | null>, value: unknown) {
  if (ref.current) ref.current.textContent = String(value);
}

interface GlyphNodeProps {
  playerRef: React.RefObject<HTMLAudioElement>;
  width: number;
  outputs: {
    status: React.RefObject<HTMLElement | null>;
    draws: React.RefObject<HTMLElement | null>;
    shapes: React.RefObject<HTMLElement | null>;
    time: React.RefObject<HTMLElement | null>;
    rate: React.RefObject<HTMLElement | null>;
    reveal: React.RefObject<HTMLElement | null>;
    state: React.RefObject<HTMLElement | null>;
    hits: React.RefObject<HTMLElement | null>;
    misses: React.RefObject<HTMLElement | null>;
    error: React.RefObject<HTMLElement | null>;
  };
}

function GlyphNode({ playerRef, width, outputs }: GlyphNodeProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const cacheRef = useRef<GlyphPathCache | null>(null);
  const layoutRef = useRef<ParagraphLayout | null>(null);
  const fontIdsRef = useRef<number[] | null>(null);
  const snapshotRef = useRef<PlaybackSnapshot | null>(null);
  const lastKeyRef = useRef<string | null>(null);
  const drawCountRef = useRef(0);
  const shapeCountRef = useRef(0);
  const widthRef = useRef(width);
  widthRef.current = width;

  const relayout = useCallback((): boolean => {
    const fontIds = fontIdsRef.current;
    if (!fontIds) return false;
    const key = `${widthRef.current}`;
    if (lastKeyRef.current === key && layoutRef.current) return false;
    layoutRef.current = getShaper().layoutParagraph({
      text: LC_TEXT,
      fontIds,
      fontSize: LC_FONT_SIZE,
      maxWidth: Math.max(1, widthRef.current - 16),
    });
    lastKeyRef.current = key;
    shapeCountRef.current += 1;
    setText(outputs.shapes, shapeCountRef.current);
    return true;
  }, [outputs.shapes]);

  const draw = useCallback(
    (snapshot: PlaybackSnapshot | null) => {
      const canvas = canvasRef.current;
      const cache = cacheRef.current;
      if (!canvas || !cache) return;
      relayout();
      const layout = layoutRef.current;
      if (!layout) return;
      const line = layout.lines[0];
      if (!line) return;

      const currentTime = snapshot?.currentTime ?? 0;
      const revealed = revealedOffset({
        tags: [],
        contentLength: LC_TEXT.length,
        startTime: 0,
        endTime: LC_DURATION,
        currentTime,
      });

      const ctx = canvas.getContext("2d")!;
      if (canvas.width !== widthRef.current) canvas.width = widthRef.current;
      if (canvas.height !== 80) canvas.height = 80;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(1, 0, 0, 1, 8, 56 - line.baseline);

      for (const cluster of line.clusters) {
        const fillFraction = clusterFill(
          revealed,
          cluster.source.utf16Start,
          cluster.source.utf16End,
        );
        const entrance = clusterEntrance(
          clusterEntranceProgress({
            revealed,
            clusterStartUtf16: cluster.source.utf16Start,
            lead: 2.5,
          }),
        );
        const style: ClusterRenderStyle = {
          inactiveColor: LC_INACTIVE,
          activeColor: LC_ACTIVE,
          fillFraction,
          opacity: entrance.opacity,
          transform: entrance.transform,
        };
        drawCluster(
          ctx as unknown as GlyphCanvasContext,
          cluster,
          line,
          style,
          { cache, fontSize: LC_FONT_SIZE },
          1,
        );
      }

      drawCountRef.current += 1;
      setText(outputs.draws, drawCountRef.current);
      setText(outputs.time, currentTime.toFixed(3));
      setText(outputs.rate, snapshot?.playbackRate ?? 1);
      setText(outputs.reveal, revealed.toFixed(3));
      setText(outputs.state, snapshot?.state ?? "paused");
      setText(outputs.hits, cache.stats.hits);
      setText(outputs.misses, cache.stats.misses);
    },
    [relayout, outputs],
  );

  // Load fonts once, then do the first layout + paint. This is the "late
  // readiness" seam: whatever the current snapshot is (possibly already
  // seeked/paused) gets painted as soon as we become ready.
  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setText(outputs.status, "loading");
    setText(outputs.error, "");
    (async () => {
      try {
        const fontIds = await ensureFonts(LIGHT_CHAIN);
        if (cancelled) return;
        fontIdsRef.current = fontIds;
        cacheRef.current = newCache();
        relayout();
        const player = playerRef.current;
        if (player) snapshotRef.current = readPlaybackSnapshot(player);
        setStatus("ready");
        setText(outputs.status, "ready");
        draw(snapshotRef.current);
      } catch (error) {
        if (cancelled) return;
        setStatus("error");
        setText(outputs.status, "error");
        setText(
          outputs.error,
          error instanceof Error ? error.message : String(error),
        );
      }
    })();
    return () => {
      cancelled = true;
      cacheRef.current?.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Width change is a layout input: repaint (draw() re-lays-out only because the
  // layout key — derived from width — changed).
  useEffect(() => {
    if (status !== "ready") return;
    draw(snapshotRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, status]);

  // Sole timing source: media-clock snapshots (no independent RAF here).
  useMediaClock(
    playerRef,
    useCallback(
      (snapshot: PlaybackSnapshot) => {
        snapshotRef.current = snapshot;
        if (status === "ready") draw(snapshot);
      },
      [draw, status],
    ),
  );

  return (
    <canvas
      ref={canvasRef}
      data-testid="lc-canvas"
      data-status={status}
      width={width}
      height={80}
    />
  );
}

function App() {
  const transportRef = useRef({
    currentTime: 0,
    duration: LC_DURATION,
    paused: true,
    playbackRate: 1,
  });
  const playerRef = useRef<HTMLAudioElement>(null!);
  const bindPlayer = useCallback((player: HTMLAudioElement | null) => {
    playerRef.current = player as HTMLAudioElement;
    if (!player) return;
    Object.defineProperties(player, {
      currentTime: {
        configurable: true,
        get: () => transportRef.current.currentTime,
        set: (value: number) => {
          transportRef.current.currentTime = value;
        },
      },
      duration: {
        configurable: true,
        get: () => transportRef.current.duration,
      },
      ended: { configurable: true, get: () => false },
      paused: { configurable: true, get: () => transportRef.current.paused },
      playbackRate: {
        configurable: true,
        get: () => transportRef.current.playbackRate,
        set: (value: number) => {
          transportRef.current.playbackRate = value;
        },
      },
      readyState: {
        configurable: true,
        get: () => HTMLMediaElement.HAVE_ENOUGH_DATA,
      },
    });
  }, []);

  const [started, setStarted] = useState(false);
  const [canvasWidth, setCanvasWidth] = useState(320);
  const [errMsg, setErrMsg] = useState("");
  const probeRef = useRef<HTMLCanvasElement | null>(null);

  const outputs = {
    status: useRef<HTMLElement | null>(null),
    draws: useRef<HTMLElement | null>(null),
    shapes: useRef<HTMLElement | null>(null),
    time: useRef<HTMLElement | null>(null),
    rate: useRef<HTMLElement | null>(null),
    reveal: useRef<HTMLElement | null>(null),
    state: useRef<HTMLElement | null>(null),
    hits: useRef<HTMLElement | null>(null),
    misses: useRef<HTMLElement | null>(null),
    error: useRef<HTMLElement | null>(null),
  };

  useEffect(() => {
    probeCanvas = probeRef.current;
    (window as unknown as { __glyph: GlyphApi }).__glyph = GLYPH_API;
  }, []);

  const dispatch = (event: string) =>
    playerRef.current.dispatchEvent(new Event(event));
  const seek = (currentTime: number) => {
    transportRef.current.currentTime = currentTime;
    dispatch("seeking");
    dispatch("seeked");
  };

  return (
    <main style={{ fontFamily: "monospace" }}>
      <audio ref={bindPlayer} />
      <canvas
        ref={probeRef}
        data-testid="probe-canvas"
        width={360}
        height={160}
      />

      <section>
        <button type="button" onClick={() => setStarted(true)}>
          lc-start
        </button>
        <button
          type="button"
          onClick={() => {
            transportRef.current.paused = false;
            dispatch("play");
          }}
        >
          lc-play
        </button>
        <button
          type="button"
          onClick={() => {
            transportRef.current.paused = true;
            dispatch("pause");
          }}
        >
          lc-pause
        </button>
        <button type="button" onClick={() => seek(5)}>
          lc-seek-mid
        </button>
        <button type="button" onClick={() => seek(0)}>
          lc-seek-start
        </button>
        <button
          type="button"
          onClick={() => {
            transportRef.current.playbackRate = 2;
            dispatch("ratechange");
          }}
        >
          lc-rate-two
        </button>
        <button
          type="button"
          onClick={() => setCanvasWidth((w) => (w === 320 ? 260 : 320))}
        >
          lc-resize
        </button>
        <button
          type="button"
          onClick={async () => {
            const report = await GLYPH_API.tryBadFont("not-a-font");
            setErrMsg(
              report.ok ? "" : `${report.errorName}: ${report.message}`,
            );
          }}
        >
          err-bad-font
        </button>
        <button
          type="button"
          onClick={() => {
            const report = GLYPH_API.validateTiming(
              [{ index: 99, time: 1 }],
              5,
            );
            setErrMsg(
              report.ok ? "" : `${report.errorName}: ${report.message}`,
            );
          }}
        >
          err-bad-timing
        </button>
      </section>

      {errMsg && (
        <div data-testid="err-msg" role="alert">
          {errMsg}
        </div>
      )}

      <output data-testid="lc-status" ref={outputs.status}>
        idle
      </output>
      <output data-testid="lc-draws" ref={outputs.draws}>
        0
      </output>
      <output data-testid="lc-shapes" ref={outputs.shapes}>
        0
      </output>
      <output data-testid="lc-time" ref={outputs.time}>
        0
      </output>
      <output data-testid="lc-rate" ref={outputs.rate}>
        1
      </output>
      <output data-testid="lc-reveal" ref={outputs.reveal}>
        0
      </output>
      <output data-testid="lc-state" ref={outputs.state}>
        paused
      </output>
      <output data-testid="lc-hits" ref={outputs.hits}>
        0
      </output>
      <output data-testid="lc-misses" ref={outputs.misses}>
        0
      </output>
      <output data-testid="lc-error" ref={outputs.error} />

      {started && (
        <GlyphNode
          playerRef={playerRef}
          width={canvasWidth}
          outputs={outputs}
        />
      )}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
