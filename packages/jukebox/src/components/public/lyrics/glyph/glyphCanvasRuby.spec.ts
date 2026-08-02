import { describe, expect, it, vi } from "vitest";

import { drawRubyPlacement, type DrawRubyParams } from "./glyphCanvas";
import { GlyphPathCache } from "./glyphOutlineCache";
import type { CanvasPathReceiver } from "./glyphOutlineCache";
import type { RubyPlacement } from "./types";

/**
 * Covers the audited edge case: a fully revealed (`fraction === 1`) ruby
 * annotation whose glyph ink extends past its logical advance box (negative
 * left side bearing and/or right overhang) must have *every* glyph outline
 * painted in the active color - the manual clip must never retain
 * inactive-color ink at the edges.
 */

function makeRuby(overrides: Partial<RubyPlacement> = {}): RubyPlacement {
  return {
    annotation: {
      content: "x",
      utf16Range: [0, 1] as const,
      graphemeRange: [0, 1] as const,
      sourceIndex: 0,
    },
    mode: "mono",
    lineIndex: 0,
    baseX: [0, 10] as const,
    y: 8,
    inkAscent: 8,
    inkDescent: 2,
    // Deliberately narrower than the ink: exercises negative left side
    // bearing (ink starts left of x=0) and right overhang (ink extends past
    // x=10, the runs' own advance box).
    inkLeft: -2,
    inkRight: 12,
    fontSize: 10,
    fontIds: [0],
    runs: [
      {
        contentRange: [0, 1],
        width: 10,
        x: 0,
        glyphs: [
          {
            glyphId: 1,
            fontId: 0,
            cluster: 0,
            clusterEnd: 1,
            clusterUtf16: 0,
            clusterEndUtf16: 1,
            xAdvance: 10,
            yAdvance: 0,
            xOffset: 0,
            yOffset: 0,
            x: 0,
          },
        ],
      },
    ],
    ...overrides,
  };
}

function fakePathReceiver(): CanvasPathReceiver {
  return {
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    closePath: vi.fn(),
  };
}

function makeCache(): GlyphPathCache {
  return new GlyphPathCache({
    lookup: () => ({
      commands: [],
      bounds: { xMin: -2, xMax: 12, yMin: -2, yMax: 8 },
      unitsPerEm: 1000,
      fontSize: 10,
      scale: 0.01,
    }),
    createPath2D: () =>
      fakePathReceiver() as unknown as Path2D & CanvasPathReceiver,
  });
}

interface RecordedFill {
  fillStyle: string;
}

function makeFakeCtx() {
  let fillStyle = "";
  const fills: RecordedFill[] = [];
  const rectCalls: { x: number; y: number; width: number; height: number }[] =
    [];
  const ctx = {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    rect: vi.fn((x: number, y: number, width: number, height: number) => {
      rectCalls.push({ x, y, width, height });
    }),
    clip: vi.fn(),
    transform: vi.fn(),
    fill: vi.fn(() => {
      fills.push({ fillStyle });
    }),
    get fillStyle() {
      return fillStyle;
    },
    set fillStyle(value: string) {
      fillStyle = value;
    },
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, fills, rectCalls };
}

function draw(params: Partial<DrawRubyParams> & { revealed: number }) {
  const { ctx, fills, rectCalls } = makeFakeCtx();
  const cache = makeCache();
  const full: DrawRubyParams = {
    ruby: makeRuby(),
    lineTop: 0,
    cache,
    inactiveColor: "INACTIVE",
    activeColor: "ACTIVE",
    ...params,
  };
  drawRubyPlacement(ctx, full);
  return { ctx, fills, rectCalls };
}

describe("drawRubyPlacement - fully revealed ruby clipping", () => {
  it("bypasses the clip and paints the active color over every glyph when fraction === 1", () => {
    // utf16Range is [0, 1); revealed === 1 -> fraction === 1 (fully revealed).
    const { fills, rectCalls } = draw({ revealed: 1 });

    // No clip rectangle should ever be constructed for a fully revealed ruby.
    expect(rectCalls).toHaveLength(0);

    // Two paint passes: the initial inactive-color base paint, then the
    // active-color paint over the same (unclipped) glyphs.
    expect(fills.map((f) => f.fillStyle)).toEqual(["INACTIVE", "ACTIVE"]);
  });

  it("still clips deterministically for a partially revealed ruby, using the ink-aware extent", () => {
    // utf16Range [0, 1); revealed 0.5 -> fraction 0.5.
    const { rectCalls, fills } = draw({ revealed: 0.5 });

    expect(rectCalls).toHaveLength(1);
    const rect = rectCalls[0]!;
    // extent = [inkLeft(-2), inkRight(12)] -> width 14; fraction 0.5 -> fillWidth 7.
    expect(rect.x).toBe(-2);
    expect(rect.width).toBe(7);
    // vertical band: baselineY(0 + y=8) -/+ inkAscent(8)/inkDescent(2).
    expect(rect.y).toBe(0);
    expect(rect.height).toBe(10);

    expect(fills.map((f) => f.fillStyle)).toEqual(["INACTIVE", "ACTIVE"]);
  });

  it("paints nothing when the ruby has no valid ink/advance extent (degenerate empty runs)", () => {
    const { fills, rectCalls } = draw({
      revealed: 1,
      ruby: makeRuby({ runs: [], inkLeft: 0, inkRight: 0 }),
    });
    expect(fills).toHaveLength(0);
    expect(rectCalls).toHaveLength(0);
  });
});
