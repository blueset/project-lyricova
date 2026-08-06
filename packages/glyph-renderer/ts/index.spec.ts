import { beforeEach, describe, expect, it, vi } from "vitest";

const { initMock } = vi.hoisted(() => ({
  initMock: vi.fn<(input?: unknown) => Promise<unknown>>(),
}));

vi.mock("../pkg/glyph_renderer.js", () => ({
  default: initMock,
  GlyphShaper: class GlyphShaper {},
  lineBreakOpportunities: vi.fn(),
}));

async function importModule() {
  return import("./index.js");
}

describe("initGlyphRenderer", () => {
  beforeEach(() => {
    vi.resetModules();
    initMock.mockReset();
  });

  it("allows retry after an initialization rejection", async () => {
    const firstError = new Error("bad wasm bytes");
    initMock.mockRejectedValueOnce(firstError).mockResolvedValueOnce(undefined);

    const { initGlyphRenderer } = await importModule();

    await expect(initGlyphRenderer(new Uint8Array([0xde, 0xad]))).rejects.toBe(
      firstError,
    );
    await expect(
      initGlyphRenderer(new Uint8Array([0x00, 0x61, 0x73, 0x6d])),
    ).resolves.toBeUndefined();

    expect(initMock).toHaveBeenCalledTimes(2);
  });

  it("dedupes concurrent initialization attempts", async () => {
    let resolveInit!: () => void;
    const pending = new Promise<void>((resolve) => {
      resolveInit = resolve;
    });
    initMock.mockReturnValueOnce(pending);

    const { initGlyphRenderer } = await importModule();

    const first = initGlyphRenderer("first");
    const second = initGlyphRenderer("second");

    expect(first).toBe(second);
    expect(initMock).toHaveBeenCalledTimes(1);
    expect(initMock).toHaveBeenCalledWith("first");

    resolveInit();
    await expect(Promise.all([first, second])).resolves.toEqual([
      undefined,
      undefined,
    ]);
  });

  it("keeps a successful initialization cached", async () => {
    initMock.mockResolvedValueOnce({ ok: true });

    const { initGlyphRenderer } = await importModule();

    const first = initGlyphRenderer("first");
    await expect(first).resolves.toEqual({ ok: true });

    const second = initGlyphRenderer("second");
    await expect(second).resolves.toEqual({ ok: true });

    expect(second).toBe(first);
    expect(initMock).toHaveBeenCalledTimes(1);
    expect(initMock).toHaveBeenCalledWith("first");
  });
});
