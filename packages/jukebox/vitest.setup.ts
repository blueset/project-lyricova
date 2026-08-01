import "@testing-library/jest-dom/vitest";

// jsdom does not implement ResizeObserver, which several lyric components
// (e.g. the Glyph Canvas renderer) attach to their container. A minimal no-op
// stub is enough for tests that don't assert on measured sizes.
if (typeof globalThis.ResizeObserver === "undefined") {
  class ResizeObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  globalThis.ResizeObserver =
    ResizeObserverStub as unknown as typeof ResizeObserver;
}
