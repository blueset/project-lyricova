import { describe, expect, it, vi } from "vitest";
import type { GlyphOutline, PathCommand } from "@lyricova/glyph-renderer";
import {
  buildGlyphPath,
  GlyphPathCache,
  type CanvasPathReceiver,
} from "./glyphOutlineCache";

/** Records the path-building calls made against it (a `Path2D` stand-in). */
class RecordingPath implements CanvasPathReceiver {
  readonly calls: (readonly [string, ...number[]])[] = [];
  moveTo(x: number, y: number): void {
    this.calls.push(["moveTo", x, y]);
  }
  lineTo(x: number, y: number): void {
    this.calls.push(["lineTo", x, y]);
  }
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
    this.calls.push(["quadraticCurveTo", cpx, cpy, x, y]);
  }
  bezierCurveTo(
    cp1x: number,
    cp1y: number,
    cp2x: number,
    cp2y: number,
    x: number,
    y: number,
  ): void {
    this.calls.push(["bezierCurveTo", cp1x, cp1y, cp2x, cp2y, x, y]);
  }
  closePath(): void {
    this.calls.push(["closePath"]);
  }
}

function outline(commands: PathCommand[]): GlyphOutline {
  return {
    commands,
    bounds: { xMin: 0, xMax: 10, yMin: 0, yMax: 10 },
    unitsPerEm: 1000,
    fontSize: 32,
    scale: 0.032,
  };
}

describe("buildGlyphPath", () => {
  it("replays every command type in order onto the receiver", () => {
    const path = new RecordingPath();
    buildGlyphPath(
      [
        { type: "moveTo", x: 1, y: 2 },
        { type: "lineTo", x: 3, y: 4 },
        { type: "quadTo", x1: 5, y1: 6, x: 7, y: 8 },
        { type: "cubicTo", x1: 9, y1: 10, x2: 11, y2: 12, x: 13, y: 14 },
        { type: "close" },
      ],
      path,
    );

    expect(path.calls).toEqual([
      ["moveTo", 1, 2],
      ["lineTo", 3, 4],
      ["quadraticCurveTo", 5, 6, 7, 8],
      ["bezierCurveTo", 9, 10, 11, 12, 13, 14],
      ["closePath"],
    ]);
  });
});

function makeCache(
  lookup: (
    fontId: number,
    glyphId: number,
    fontSize: number,
    variations: readonly string[],
  ) => GlyphOutline | null,
) {
  const created: RecordingPath[] = [];
  const cache = new GlyphPathCache({
    lookup,
    createPath2D: () => {
      const path = new RecordingPath();
      created.push(path);
      return path as unknown as Path2D & CanvasPathReceiver;
    },
  });
  return { cache, created };
}

describe("GlyphPathCache", () => {
  it("builds a path on a miss and reuses it on a hit", () => {
    const lookup = vi.fn(() => outline([{ type: "moveTo", x: 0, y: 0 }]));
    const { cache, created } = makeCache(lookup);

    const first = cache.getPath(1, 42, 32);
    const second = cache.getPath(1, 42, 32);

    expect(first).not.toBeNull();
    expect(second).toBe(first); // identical cached instance reused
    expect(lookup).toHaveBeenCalledTimes(1);
    expect(created).toHaveLength(1);
    expect(cache.stats).toEqual({ hits: 1, misses: 1 });
    expect(cache.size).toBe(1);
  });

  it("caches a null outline (no rebuild, no path) for whitespace glyphs", () => {
    const lookup = vi.fn(() => null);
    const { cache, created } = makeCache(lookup);

    expect(cache.getPath(0, 3, 32)).toBeNull();
    expect(cache.getPath(0, 3, 32)).toBeNull();

    expect(lookup).toHaveBeenCalledTimes(1); // second call served from cache
    expect(created).toHaveLength(0); // no Path2D built for a null outline
    expect(cache.stats).toEqual({ hits: 1, misses: 1 });
    expect(cache.size).toBe(1);
  });

  it("keys on font, glyph, size and variations independently", () => {
    const lookup = vi.fn(() => outline([{ type: "moveTo", x: 0, y: 0 }]));
    const { cache } = makeCache(lookup);

    cache.getPath(1, 42, 32);
    cache.getPath(2, 42, 32); // different font
    cache.getPath(1, 43, 32); // different glyph
    cache.getPath(1, 42, 48); // different size
    cache.getPath(1, 42, 32, ["wght=700"]); // different variations

    expect(lookup).toHaveBeenCalledTimes(5);
    expect(cache.size).toBe(5);
  });

  it("passes size and variations through to the lookup", () => {
    const lookup = vi.fn(() => outline([{ type: "moveTo", x: 0, y: 0 }]));
    const { cache } = makeCache(lookup);

    cache.getPath(7, 5, 24, ["wght=650", "opsz=18"]);

    expect(lookup).toHaveBeenCalledWith(7, 5, 24, ["wght=650", "opsz=18"]);
  });

  it("actually tessellates the outline commands into the built path", () => {
    const commands: PathCommand[] = [
      { type: "moveTo", x: 1, y: 1 },
      { type: "cubicTo", x1: 2, y1: 2, x2: 3, y2: 3, x: 4, y: 4 },
      { type: "close" },
    ];
    const { cache, created } = makeCache(() => outline(commands));

    cache.getPath(1, 1, 32);

    expect(created).toHaveLength(1);
    expect(created[0].calls).toEqual([
      ["moveTo", 1, 1],
      ["bezierCurveTo", 2, 2, 3, 3, 4, 4],
      ["closePath"],
    ]);
  });

  it("clears cached paths and resets stats", () => {
    const lookup = vi.fn(() => outline([{ type: "moveTo", x: 0, y: 0 }]));
    const { cache } = makeCache(lookup);

    cache.getPath(1, 42, 32);
    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.stats).toEqual({ hits: 0, misses: 0 });

    cache.getPath(1, 42, 32);
    expect(lookup).toHaveBeenCalledTimes(2); // rebuilt after clear
  });

  // Runtime smoke against a *real* Path2D when the host provides one (a real
  // browser, or Node with a canvas polyfill). Skipped under jsdom, which does
  // not implement Path2D - the pure tests above cover the build logic there.
  const hasPath2D = typeof globalThis.Path2D !== "undefined";
  it.skipIf(!hasPath2D)("builds onto a real Path2D without throwing", () => {
    const cache = new GlyphPathCache({
      lookup: () =>
        outline([
          { type: "moveTo", x: 0, y: 0 },
          { type: "lineTo", x: 10, y: 0 },
          { type: "quadTo", x1: 10, y1: 10, x: 0, y: 10 },
          { type: "cubicTo", x1: -2, y1: 8, x2: -2, y2: 2, x: 0, y: 0 },
          { type: "close" },
        ]),
    });
    const path = cache.getPath(1, 42, 32);
    expect(path).toBeInstanceOf(globalThis.Path2D);
  });
});
