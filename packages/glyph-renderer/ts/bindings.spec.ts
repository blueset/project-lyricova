import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import init, { GlyphShaper } from "../pkg/glyph_renderer.js";

let shaper: GlyphShaper;
let fontId: number;

describe("wasm request bindings", () => {
  beforeAll(async () => {
    const wasm = await readFile(
      new URL("../pkg/glyph_renderer_bg.wasm", import.meta.url),
    );
    await init({ module_or_path: wasm });

    shaper = new GlyphShaper();
    const font = await readFile(
      new URL("../../api/src/fonts/Mona-Sans-Regular.otf", import.meta.url),
    );
    fontId = shaper.registerFont(font, 0);
  });

  afterAll(() => {
    shaper.free();
  });

  it("removes undefined fields from objects nested in arrays", () => {
    const layout = shaper.layoutParagraph({
      text: "ab",
      fontIds: [fontId],
      fontSize: 32,
      rangeAdvances: [
        {
          start: 0,
          end: 2,
          minAdvance: 100,
          distribution: undefined,
        },
      ],
    });

    expect(layout.lines).toHaveLength(1);
    expect(layout.width).toBeCloseTo(100);
  });
});
