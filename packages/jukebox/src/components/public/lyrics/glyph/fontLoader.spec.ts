import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_GLYPH_FONT_CHAIN,
  GlyphFontLoadError,
  GlyphWasmLoadError,
  __resetGlyphWasmRuntimeForTests,
  fetchFontBytes,
  initGlyphRuntime,
  loadGlyphFonts,
  type RegisterableShaper,
} from "./fontLoader";

class FakeShaper implements RegisterableShaper {
  registered: Uint8Array[] = [];
  freed = false;
  failAtIndex: number | null = null;

  registerFont(bytes: Uint8Array): number {
    if (this.failAtIndex === this.registered.length) {
      throw new Error("unparsable font bytes");
    }
    this.registered.push(bytes);
    return this.registered.length; // 1-based id
  }
  free(): void {
    this.freed = true;
  }
}

function okFetch(): typeof fetch {
  return vi.fn(
    async () => new Response(new Uint8Array([1, 2, 3, 4]), { status: 200 }),
  ) as unknown as typeof fetch;
}

describe("fetchFontBytes", () => {
  it("returns the bytes for an OK response", async () => {
    const bytes = await fetchFontBytes("inter-variable-ttf", {
      baseUrl: "/api/fonts",
      fetchImpl: okFetch(),
    });
    expect(bytes).toEqual(new Uint8Array([1, 2, 3, 4]));
  });

  it("surfaces a non-OK response as a GlyphFontLoadError with the status", async () => {
    const fetchImpl = vi.fn(
      async () => new Response("nope", { status: 404 }),
    ) as unknown as typeof fetch;
    await expect(
      fetchFontBytes("inter-variable-ttf", {
        baseUrl: "/api/fonts",
        fetchImpl,
      }),
    ).rejects.toMatchObject({
      name: "GlyphFontLoadError",
      fontManifestId: "inter-variable-ttf",
      status: 404,
    });
  });

  it("rejects an empty body", async () => {
    const fetchImpl = vi.fn(
      async () => new Response(new Uint8Array([]), { status: 200 }),
    ) as unknown as typeof fetch;
    await expect(
      fetchFontBytes("inter-variable-ttf", {
        baseUrl: "/api/fonts",
        fetchImpl,
      }),
    ).rejects.toThrow(/empty body/);
  });

  it("wraps a network error", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("connection refused");
    }) as unknown as typeof fetch;
    await expect(
      fetchFontBytes("inter-variable-ttf", {
        baseUrl: "/api/fonts",
        fetchImpl,
      }),
    ).rejects.toBeInstanceOf(GlyphFontLoadError);
  });
});

describe("loadGlyphFonts", () => {
  it("registers the whole chain in order and returns parallel ids", async () => {
    const shaper = new FakeShaper();
    const result = await loadGlyphFonts({
      fontManifestIds: ["inter-variable-ttf", "source-han-sans-vf-otf"],
      fetchImpl: okFetch(),
      createShaper: () => shaper,
    });
    expect(result.shaper).toBe(shaper);
    expect(result.fontIds).toEqual([1, 2]);
    expect(result.fontManifestIds).toEqual([
      "inter-variable-ttf",
      "source-han-sans-vf-otf",
    ]);
    expect(shaper.freed).toBe(false);
  });

  it("uses the deterministic fallback chain (Latin first, PlanGothic P2 last)", () => {
    // Inter replaced Mona Sans here: Mona is Latin-only (no Cyrillic, two Greek
    // code points) while Inter maps 2852 code points in a smaller file. Mona
    // stays in the API manifest, but client-side validation is derived from
    // *this* chain, so it is no longer fetchable from the browser.
    expect(DEFAULT_GLYPH_FONT_CHAIN[0]).toBe("inter-variable-ttf");
    expect(DEFAULT_GLYPH_FONT_CHAIN[DEFAULT_GLYPH_FONT_CHAIN.length - 1]).toBe(
      "plangothic-p2-regular-ttf",
    );
    expect(DEFAULT_GLYPH_FONT_CHAIN).toEqual([
      "inter-variable-ttf",
      "noto-sans-thai-looped-vf-ttf",
      "noto-sans-lao-looped-vf-ttf",
      "noto-sans-devanagari-vf-ttf",
      "noto-sans-hebrew-vf-ttf",
      "noto-sans-arabic-vf-ttf",
      "source-han-sans-jp-vf",
      "source-han-sans-sc-vf",
      "source-han-sans-tc-vf",
      "source-han-sans-vf-otf",
      "plangothic-p1-regular-ttf",
      "plangothic-p2-regular-ttf",
    ]);
  });

  it("frees the shaper and throws when a font id is not whitelisted", async () => {
    const shaper = new FakeShaper();
    await expect(
      loadGlyphFonts({
        fontManifestIds: ["inter-variable-ttf", "not-a-real-font"],
        fetchImpl: okFetch(),
        createShaper: () => shaper,
      }),
    ).rejects.toMatchObject({
      name: "GlyphFontLoadError",
      fontManifestId: "not-a-real-font",
    });
    expect(shaper.freed).toBe(true);
  });

  it("frees the shaper and surfaces a registration failure", async () => {
    const shaper = new FakeShaper();
    shaper.failAtIndex = 1; // second font fails to register
    await expect(
      loadGlyphFonts({
        fontManifestIds: ["inter-variable-ttf", "source-han-sans-vf-otf"],
        fetchImpl: okFetch(),
        createShaper: () => shaper,
      }),
    ).rejects.toThrow(/Failed to register/);
    expect(shaper.freed).toBe(true);
  });

  it("frees the shaper and surfaces a failed font fetch", async () => {
    const shaper = new FakeShaper();
    const fetchImpl = vi.fn(
      async () => new Response("nope", { status: 500 }),
    ) as unknown as typeof fetch;
    await expect(
      loadGlyphFonts({
        fontManifestIds: ["inter-variable-ttf"],
        fetchImpl,
        createShaper: () => shaper,
      }),
    ).rejects.toBeInstanceOf(GlyphFontLoadError);
    expect(shaper.freed).toBe(true);
  });

  it("rejects an empty chain", async () => {
    await expect(
      loadGlyphFonts({
        fontManifestIds: [],
        fetchImpl: okFetch(),
        createShaper: () => new FakeShaper(),
      }),
    ).rejects.toThrow(/At least one font/);
  });
});

describe("initGlyphRuntime", () => {
  beforeEach(() => {
    __resetGlyphWasmRuntimeForTests();
  });

  it("fetches the wasm route and instantiates it with the response", async () => {
    const response = new Response(new Uint8Array([0, 97, 115, 109]), {
      status: 200,
    });
    const fetchImpl = vi.fn(async () => response) as unknown as typeof fetch;
    const init = vi.fn(async () => undefined);
    await initGlyphRuntime({ fetchImpl, init });
    expect(fetchImpl).toHaveBeenCalledWith("/api/glyph-renderer/wasm");
    expect(init).toHaveBeenCalledWith(response);
  });

  it("surfaces a non-OK wasm route response", async () => {
    const fetchImpl = vi.fn(
      async () => new Response("nope", { status: 502 }),
    ) as unknown as typeof fetch;
    await expect(
      initGlyphRuntime({ fetchImpl, init: async () => undefined }),
    ).rejects.toBeInstanceOf(GlyphWasmLoadError);
  });

  it("surfaces an instantiation failure", async () => {
    const fetchImpl = vi.fn(
      async () => new Response(new Uint8Array([1]), { status: 200 }),
    ) as unknown as typeof fetch;
    await expect(
      initGlyphRuntime({
        fetchImpl,
        init: async () => {
          throw new Error("bad magic");
        },
      }),
    ).rejects.toThrow(/instantiate/);
  });

  it("retries from scratch after a failed shared attempt", async () => {
    const fetchImpl = vi.fn(
      async () => new Response(new Uint8Array([1]), { status: 200 }),
    ) as unknown as typeof fetch;
    const init = vi
      .fn()
      .mockRejectedValueOnce(new Error("bad magic"))
      .mockResolvedValueOnce(undefined);

    await expect(initGlyphRuntime({ fetchImpl, init })).rejects.toThrow(
      /instantiate/,
    );
    await expect(
      initGlyphRuntime({ fetchImpl, init }),
    ).resolves.toBeUndefined();
    expect(init).toHaveBeenCalledTimes(2);
  });

  it("dedupes concurrent callers into a single shared fetch+init", async () => {
    let resolveInit!: () => void;
    const pendingInit = new Promise<void>((resolve) => {
      resolveInit = resolve;
    });
    const response = new Response(new Uint8Array([1]), { status: 200 });
    const fetchImpl = vi.fn(async () => response) as unknown as typeof fetch;
    const init = vi.fn(() => pendingInit);

    const first = initGlyphRuntime({ fetchImpl, init });
    const second = initGlyphRuntime({ fetchImpl, init });
    const third = initGlyphRuntime({ fetchImpl, init });

    // Let the microtask queue settle so all three calls have observed the
    // in-flight shared promise instead of racing to start their own.
    await Promise.resolve();
    await Promise.resolve();

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(init).toHaveBeenCalledTimes(1);

    resolveInit();
    await expect(Promise.all([first, second, third])).resolves.toEqual([
      undefined,
      undefined,
      undefined,
    ]);
  });

  it(
    "first mount fetch resolved -> abort during delayed init -> second " +
      "mount/caller still succeeds off the same shared attempt",
    async () => {
      let resolveInit!: () => void;
      const pendingInit = new Promise<void>((resolve) => {
        resolveInit = resolve;
      });
      const response = new Response(new Uint8Array([1]), { status: 200 });
      const fetchImpl = vi.fn(async () => response) as unknown as typeof fetch;
      const init = vi.fn(() => pendingInit);

      // First "mount": fetch resolves synchronously (well, on tick), but
      // wasm-bindgen's init() is still pending when the component unmounts
      // and aborts its own signal.
      const firstController = new AbortController();
      const first = initGlyphRuntime({
        fetchImpl,
        init,
        signal: firstController.signal,
      });
      // Let the fetch complete and init() start before aborting.
      await Promise.resolve();
      await Promise.resolve();
      firstController.abort();

      await expect(first).rejects.toMatchObject({ name: "AbortError" });

      // Second "mount"/caller: joins the same shared attempt, which must
      // not have been poisoned by the first caller's abort.
      const second = initGlyphRuntime({ fetchImpl, init });
      resolveInit();
      await expect(second).resolves.toBeUndefined();

      // The underlying fetch/init only ever ran once - the abort never
      // touched the shared work.
      expect(fetchImpl).toHaveBeenCalledTimes(1);
      expect(init).toHaveBeenCalledTimes(1);
    },
  );

  it("rejects immediately for a caller whose signal is already aborted, without poisoning shared state", async () => {
    const response = new Response(new Uint8Array([1]), { status: 200 });
    const fetchImpl = vi.fn(async () => response) as unknown as typeof fetch;
    const init = vi.fn(async () => undefined);

    const controller = new AbortController();
    controller.abort();

    await expect(
      initGlyphRuntime({ fetchImpl, init, signal: controller.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });

    // A later, unaborted caller still gets a healthy shared result.
    await expect(
      initGlyphRuntime({ fetchImpl, init }),
    ).resolves.toBeUndefined();
    expect(init).toHaveBeenCalledTimes(1);
  });

  it("never produces an unhandled rejection when an aborted caller's shared attempt later fails", async () => {
    const unhandled: unknown[] = [];
    const onUnhandledRejection = (reason: unknown) => {
      unhandled.push(reason);
    };
    process.on("unhandledRejection", onUnhandledRejection);

    try {
      let rejectInit!: (error: unknown) => void;
      const pendingInit = new Promise<void>((_resolve, reject) => {
        rejectInit = reject;
      });
      const response = new Response(new Uint8Array([1]), { status: 200 });
      const fetchImpl = vi.fn(async () => response) as unknown as typeof fetch;
      const init = vi.fn(() => pendingInit);

      const controller = new AbortController();
      const call = initGlyphRuntime({
        fetchImpl,
        init,
        signal: controller.signal,
      });
      await Promise.resolve();
      await Promise.resolve();
      controller.abort();
      await expect(call).rejects.toMatchObject({ name: "AbortError" });

      rejectInit(new Error("bad magic"));
      // Give the runtime a chance to flush any unhandled rejection.
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(unhandled).toEqual([]);
    } finally {
      process.off("unhandledRejection", onUnhandledRejection);
    }
  });
});
