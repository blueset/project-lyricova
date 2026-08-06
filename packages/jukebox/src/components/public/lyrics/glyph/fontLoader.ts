import {
  GlyphShaper,
  initGlyphRenderer,
  type FontId,
} from "@lyricova/glyph-renderer";

/**
 * Lazy font + WASM delivery for the Glyph Canvas renderer.
 *
 * Nothing here runs until the renderer is actually selected: the caller first
 * initializes the WASM module ({@link initGlyphRuntime}) and then fetches the
 * whitelisted font bytes and registers them into a fresh {@link GlyphShaper}
 * ({@link loadGlyphFonts}), producing a deterministic fallback chain.
 *
 * All failures are surfaced as explicit typed errors ({@link GlyphWasmLoadError},
 * {@link GlyphFontLoadError}) so the component can render a visible error state
 * instead of silently falling back to an empty/blank success.
 */

/** Base URL of the API package's whitelisted font delivery route. */
export const DEFAULT_FONT_BASE_URL = "/api/fonts";

/** URL of the whitelisted local WASM byte route (see `src/app/api/glyph-renderer/wasm`). */
export const DEFAULT_WASM_URL = "/api/glyph-renderer/wasm";

/**
 * Creates a fresh, empty {@link GlyphShaper}. Extracted as a tiny factory so
 * the coverage-aware lazy path ({@link GlyphFontManager}) and the eager
 * whole-chain path ({@link loadGlyphFonts}) both create their shaper the same
 * way, and so the React integration can mock shaper construction in jsdom
 * tests (where the WASM module is not instantiated).
 */
export function createGlyphShaper(): GlyphShaper {
  return new GlyphShaper();
}

/**
 * The deterministic base + ruby font fallback chain, in first-match-wins
 * order. Selection is coverage-driven ({@link GlyphFontManager}): a font is
 * only fetched when a line's text actually needs it, so the multi-megabyte
 * Source Han members below are downloaded lazily (often never), not on mount.
 *
 * The order is latin → Thai → the Source Han region subsets (JP, SC, TC) →
 * the full Source Han VF catch-all:
 *
 * 1. `inter-variable-ttf` — Latin/Greek/Cyrillic variable fallback (~859 KiB);
 *    also the natural guaranteed base font for otherwise-uncoverable lines.
 *    It replaced `mona-sans-latin-otf`, which is Latin-only (no Cyrillic, two
 *    Greek code points) in a larger file; Inter maps 2852 code points against
 *    Mona's 568. Mona stays whitelisted in the API manifest, so swapping back
 *    is a one-line change here.
 * 2. `noto-sans-thai-vf-ttf` — Thai shaping and outlines (~214 KB). Kept for
 *    Thai coverage; its position is functionally neutral because selection is
 *    coverage-driven, not position-driven.
 * 3. `source-han-sans-jp-vf` — Adobe's official Japanese region subset of
 *    Source Han Sans (~8.0 MiB).
 * 4. `source-han-sans-sc-vf` — official Simplified Chinese (CN) region subset
 *    (~14.9 MiB).
 * 5. `source-han-sans-tc-vf` — official Traditional Chinese (TW) region subset
 *    (~10.0 MiB).
 * 6. `source-han-sans-vf-otf` — full Source Han Sans variable OTF (~29.3 MiB),
 *    the final catch-all for any Han/kana/Hangul codepoint the region subsets
 *    miss.
 *
 * The renderer shapes every member with OpenType `palt=1`, `wght=600` and an
 * `opsz` that tracks the rendered size (see `fontVariations.ts`). Axis ranges
 * differ per face - Inter's `opsz` is 14-32, Mona's was 0-100 - so the real
 * size is passed and each face clamps it to its own range.
 */
export const GLYPH_FONT_MANIFEST_IDS = [
  "inter-variable-ttf",
  "noto-sans-thai-vf-ttf",
  "source-han-sans-jp-vf",
  "source-han-sans-sc-vf",
  "source-han-sans-tc-vf",
  "source-han-sans-vf-otf",
] as const;

export type GlyphFontManifestId = (typeof GLYPH_FONT_MANIFEST_IDS)[number];

export const DEFAULT_GLYPH_FONT_CHAIN = GLYPH_FONT_MANIFEST_IDS;

// The API owns this fixed public manifest. Keep client-side validation narrow
// so arbitrary IDs never trigger requests against the font byte endpoint.
const KNOWN_FONT_IDS = new Set<string>(GLYPH_FONT_MANIFEST_IDS);

/** Thrown when the local WASM byte route cannot be fetched/instantiated. */
export class GlyphWasmLoadError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "GlyphWasmLoadError";
  }
}

/** Thrown when a whitelisted font's bytes cannot be fetched or registered. */
export class GlyphFontLoadError extends Error {
  constructor(
    readonly fontManifestId: string,
    message: string,
    readonly status?: number,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "GlyphFontLoadError";
  }
}

export interface InitGlyphRuntimeOptions {
  /** WASM byte route URL. Defaults to {@link DEFAULT_WASM_URL}. */
  wasmUrl?: string;
  /** Injectable `fetch` (defaults to the global). */
  fetchImpl?: typeof fetch;
  /** Injectable wasm-bindgen init (defaults to {@link initGlyphRenderer}). */
  init?: (input: Response) => Promise<unknown>;
  signal?: AbortSignal;
}

interface SharedWasmInitOptions {
  wasmUrl: string;
  fetchImpl: typeof fetch;
  init: (input: Response) => Promise<unknown>;
}

/**
 * The loader-level singleton in-flight/completed WASM fetch+init attempt.
 *
 * Deliberately module-scoped and never given any individual caller's
 * `AbortSignal`: the fetch + wasm-bindgen `init()` call is shared
 * infrastructure that unrelated mounts may depend on concurrently, so one
 * component unmounting (React Strict Mode's double-invoke, a fast remount, a
 * route change) must never cancel/reject the response body out from under
 * every other caller waiting on it.
 */
let sharedWasmInit: Promise<void> | undefined;

/**
 * Starts (or reuses) the shared WASM fetch+instantiate attempt. Only the
 * first caller to observe `sharedWasmInit === undefined` actually determines
 * the `wasmUrl`/`fetchImpl`/`init` used for that attempt; every other
 * concurrent/later caller just awaits the same promise. On failure the
 * singleton is cleared so the *next* call retries from scratch - mirroring
 * `initGlyphRenderer`'s own retry-on-failure contract in
 * `@lyricova/glyph-renderer`.
 */
function getSharedWasmInit(options: SharedWasmInitOptions): Promise<void> {
  if (sharedWasmInit) return sharedWasmInit;

  const attempt = (async () => {
    const { wasmUrl, fetchImpl, init } = options;
    let response: Response;
    try {
      // Intentionally no `signal`: this fetch/instantiate is shared
      // infrastructure, not scoped to any individual caller - see
      // `sharedWasmInit` above.
      response = await fetchImpl(wasmUrl);
    } catch (cause) {
      throw new GlyphWasmLoadError(
        `Failed to fetch the glyph renderer WASM from ${wasmUrl}.`,
        cause,
      );
    }
    if (!response.ok) {
      throw new GlyphWasmLoadError(
        `Glyph renderer WASM route ${wasmUrl} responded ${response.status}.`,
      );
    }
    try {
      await init(response);
    } catch (cause) {
      throw new GlyphWasmLoadError(
        "Failed to instantiate the glyph renderer WASM module.",
        cause,
      );
    }
  })();

  const tracked = attempt.catch((error) => {
    if (sharedWasmInit === tracked) {
      sharedWasmInit = undefined;
    }
    throw error;
  });
  sharedWasmInit = tracked;
  return tracked;
}

/** Clears the shared WASM init singleton. Exposed for tests only. */
export function __resetGlyphWasmRuntimeForTests(): void {
  sharedWasmInit = undefined;
}

/** Builds/rethrows the abort signal's reason, defaulting to a DOMException-like `AbortError`. */
function abortReason(signal: AbortSignal): unknown {
  const reason = (signal as { reason?: unknown }).reason;
  if (reason !== undefined) return reason;
  const error = new Error("Aborted");
  error.name = "AbortError";
  return error;
}

/**
 * Initializes the WASM glyph renderer by fetching its bytes from the local,
 * whitelisted byte route and handing the `Response` straight to wasm-bindgen
 * (which uses `WebAssembly.instantiateStreaming` when the route serves
 * `application/wasm`). This avoids relying on the default
 * `new URL('..._bg.wasm', import.meta.url)` asset resolution, which is not
 * dependable across Next.js bundling modes.
 *
 * The actual fetch/instantiate work is a loader-level singleton shared by
 * every caller (see {@link getSharedWasmInit}) - it is safe to call
 * repeatedly, and concurrent callers dedupe into a single fetch+init.
 * `options.signal`, if given, only controls *this call's* returned promise:
 * aborting it makes this call reject early (without touching the shared
 * work, which keeps running for any other caller still awaiting it).
 */
export async function initGlyphRuntime(
  options: InitGlyphRuntimeOptions = {},
): Promise<void> {
  const {
    wasmUrl = DEFAULT_WASM_URL,
    fetchImpl = fetch,
    init = (input: Response) => initGlyphRenderer(input),
    signal,
  } = options;

  const shared = getSharedWasmInit({ wasmUrl, fetchImpl, init });

  if (!signal) return shared;

  if (signal.aborted) {
    // Still attach a handler to the shared promise so a later rejection can
    // never surface as an unhandled rejection just because this particular
    // caller never waited for it.
    shared.catch(() => {});
    throw abortReason(signal);
  }

  return new Promise<void>((resolve, reject) => {
    const onAbort = () => {
      signal.removeEventListener("abort", onAbort);
      reject(abortReason(signal));
    };
    signal.addEventListener("abort", onAbort);

    shared.then(
      () => {
        signal.removeEventListener("abort", onAbort);
        resolve();
      },
      (error) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
}

/** Minimal shaper surface {@link loadGlyphFonts} needs to register fonts. */
export interface RegisterableShaper {
  registerFont(bytes: Uint8Array, faceIndex?: number): FontId;
  free(): void;
}

export interface LoadGlyphFontsOptions<S extends RegisterableShaper> {
  /** Manifest ids to register, in fallback order. Defaults to {@link DEFAULT_GLYPH_FONT_CHAIN}. */
  fontManifestIds?: readonly string[];
  /** Base URL for font delivery. Defaults to {@link DEFAULT_FONT_BASE_URL}. */
  baseUrl?: string;
  /** Injectable `fetch` (defaults to the global). */
  fetchImpl?: typeof fetch;
  /** Factory for a fresh shaper (defaults to a real {@link GlyphShaper}). */
  createShaper?: () => S;
  signal?: AbortSignal;
}

export interface LoadedGlyphFonts<S extends RegisterableShaper> {
  /** The shaper with every chain font registered. Caller owns `free()`. */
  shaper: S;
  /** Registered {@link FontId}s in fallback order (parallel to `fontManifestIds`). */
  fontIds: FontId[];
  /** Manifest ids in fallback order (parallel to `fontIds`). */
  fontManifestIds: string[];
}

/**
 * Fetches each whitelisted font's raw bytes and registers them into a fresh
 * shaper, yielding the ordered {@link FontId} fallback chain. On any failure
 * the partially-built shaper is freed and a {@link GlyphFontLoadError} is
 * thrown - the caller never receives a half-initialized shaper.
 */
export async function loadGlyphFonts<
  S extends RegisterableShaper = GlyphShaper,
>(options: LoadGlyphFontsOptions<S> = {}): Promise<LoadedGlyphFonts<S>> {
  const {
    fontManifestIds = DEFAULT_GLYPH_FONT_CHAIN,
    baseUrl = DEFAULT_FONT_BASE_URL,
    fetchImpl = fetch,
    createShaper = () => new GlyphShaper() as unknown as S,
    signal,
  } = options;

  if (fontManifestIds.length === 0) {
    throw new GlyphFontLoadError(
      "(none)",
      "At least one font must be provided for the fallback chain.",
    );
  }

  const shaper = createShaper();
  const fontIds: FontId[] = [];
  const usedIds: string[] = [];

  try {
    for (const id of fontManifestIds) {
      if (!KNOWN_FONT_IDS.has(id)) {
        throw new GlyphFontLoadError(
          id,
          `Font id "${id}" is not in the whitelisted font manifest.`,
        );
      }
      const bytes = await fetchFontBytes(id, { baseUrl, fetchImpl, signal });
      let fontId: FontId;
      try {
        fontId = shaper.registerFont(bytes);
      } catch (cause) {
        throw new GlyphFontLoadError(
          id,
          `Failed to register font "${id}" with the shaper (unparsable bytes?).`,
          undefined,
          cause,
        );
      }
      fontIds.push(fontId);
      usedIds.push(id);
    }
  } catch (error) {
    shaper.free();
    throw error;
  }

  return { shaper, fontIds, fontManifestIds: usedIds };
}

interface FetchFontBytesOptions {
  baseUrl: string;
  fetchImpl: typeof fetch;
  signal?: AbortSignal;
}

/** Fetches one whitelisted font's raw bytes as a `Uint8Array`. */
export async function fetchFontBytes(
  fontManifestId: string,
  options: FetchFontBytesOptions,
): Promise<Uint8Array> {
  const { baseUrl, fetchImpl, signal } = options;
  const url = `${baseUrl.replace(/\/$/, "")}/${encodeURIComponent(fontManifestId)}`;

  let response: Response;
  try {
    response = await fetchImpl(url, { signal });
  } catch (cause) {
    throw new GlyphFontLoadError(
      fontManifestId,
      `Failed to fetch font "${fontManifestId}" from ${url}.`,
      undefined,
      cause,
    );
  }
  if (!response.ok) {
    throw new GlyphFontLoadError(
      fontManifestId,
      `Font route ${url} responded ${response.status}.`,
      response.status,
    );
  }

  const buffer = await response.arrayBuffer();
  if (buffer.byteLength === 0) {
    throw new GlyphFontLoadError(
      fontManifestId,
      `Font "${fontManifestId}" was served with an empty body.`,
    );
  }
  return new Uint8Array(buffer);
}
