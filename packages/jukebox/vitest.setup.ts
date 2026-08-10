import "@testing-library/jest-dom/vitest";

if (typeof globalThis.CSS === "undefined") {
  Object.defineProperty(globalThis, "CSS", {
    configurable: true,
    value: {},
  });
}
if (typeof globalThis.CSS.supports !== "function") {
  Object.defineProperty(globalThis.CSS, "supports", {
    configurable: true,
    value: () => false,
  });
}

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
