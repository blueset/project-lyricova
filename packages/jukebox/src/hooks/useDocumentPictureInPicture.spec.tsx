import { act, renderHook, waitFor } from "@testing-library/react";
import type { RefObject } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  preparePictureInPictureDocument,
  useDocumentPictureInPicture,
} from "./useDocumentPictureInPicture";

class PictureInPictureWindowStub extends EventTarget {
  readonly document = document.implementation.createHTMLDocument("PiP");
  closed = false;
  readonly close = vi.fn(() => {
    this.closed = true;
  });
}

function setDocumentPictureInPictureApi(
  requestWindow: () => Promise<Window>,
) {
  Object.defineProperty(window, "isSecureContext", {
    configurable: true,
    value: true,
  });
  Object.defineProperty(window, "documentPictureInPicture", {
    configurable: true,
    value: {
      requestWindow: vi.fn(requestWindow),
    },
  });
  return window.documentPictureInPicture.requestWindow;
}

function createHostRef(width = 640, height = 360) {
  const host = document.createElement("div");
  vi.spyOn(host, "getBoundingClientRect").mockReturnValue({
    bottom: height,
    height,
    left: 0,
    right: width,
    top: 0,
    width,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
  return { current: host } satisfies RefObject<HTMLElement>;
}

describe("preparePictureInPictureDocument", () => {
  let sourceStyle: HTMLStyleElement;

  beforeEach(() => {
    sourceStyle = document.createElement("style");
    sourceStyle.textContent = ".pip-test { color: red; }";
    document.head.append(sourceStyle);
    document.documentElement.className = "dark";
    document.body.className = "font-test";
    document.body.style.setProperty("--brand-hue", "123");
  });

  afterEach(() => {
    sourceStyle.remove();
    document.documentElement.removeAttribute("class");
    document.body.removeAttribute("class");
    document.body.removeAttribute("style");
  });

  it("copies styles, document attributes, and viewport sizing", async () => {
    const targetDocument = document.implementation.createHTMLDocument("PiP");
    const { portalContainer, cleanup } = preparePictureInPictureDocument(
      document,
      targetDocument,
    );

    expect(targetDocument.querySelector("base")?.href).toBe(document.baseURI);
    expect(targetDocument.documentElement.className).toBe("dark");
    expect(targetDocument.body.className).toBe("font-test");
    expect(targetDocument.body.style.getPropertyValue("--brand-hue")).toBe(
      "123",
    );
    expect(targetDocument.body.style.overflow).toBe("hidden");
    expect(targetDocument.body.contains(portalContainer)).toBe(true);
    expect(targetDocument.head.textContent).toContain(
      ".pip-test { color: red; }",
    );

    sourceStyle.textContent = ".pip-test { color: blue; }";
    await waitFor(() =>
      expect(targetDocument.head.textContent).toContain(
        ".pip-test { color: blue; }",
      ),
    );

    cleanup();
  });
});

describe("useDocumentPictureInPicture", () => {
  beforeEach(() => {
    Object.defineProperty(window, "focus", {
      configurable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(window, "documentPictureInPicture");
    Reflect.deleteProperty(window, "isSecureContext");
    vi.restoreAllMocks();
  });

  it("detects support and requests the current host size", async () => {
    const pipWindow = new PictureInPictureWindowStub();
    const requestWindow = setDocumentPictureInPictureApi(async () => {
      return pipWindow as unknown as Window;
    });
    const onError = vi.fn();
    const hostRef = createHostRef();
    const hook = renderHook(() =>
      useDocumentPictureInPicture({ hostRef, onError }),
    );

    await waitFor(() => expect(hook.result.current.isSupported).toBe(true));
    await act(() => hook.result.current.open());

    expect(requestWindow).toHaveBeenCalledWith({
      disallowReturnToOpener: true,
      height: 360,
      width: 640,
    });
    expect(hook.result.current.pipWindow).toBe(pipWindow);
    expect(
      pipWindow.document.body.contains(
        hook.result.current.portalContainer as Node,
      ),
    ).toBe(true);
    expect(onError).not.toHaveBeenCalled();
  });

  it("omits invalid dimensions and prevents duplicate opening requests", async () => {
    const pipWindow = new PictureInPictureWindowStub();
    let resolveWindow!: (value: Window) => void;
    const requestWindow = setDocumentPictureInPictureApi(
      () =>
        new Promise<Window>((resolve) => {
          resolveWindow = resolve;
        }),
    );
    const hook = renderHook(() =>
      useDocumentPictureInPicture({
        hostRef: createHostRef(0, 0),
        onError: vi.fn(),
      }),
    );
    await waitFor(() => expect(hook.result.current.isSupported).toBe(true));

    let firstOpen!: Promise<void>;
    act(() => {
      firstOpen = hook.result.current.open();
      void hook.result.current.open();
    });
    expect(requestWindow).toHaveBeenCalledTimes(1);
    expect(requestWindow).toHaveBeenCalledWith({
      disallowReturnToOpener: true,
    });

    await act(async () => {
      resolveWindow(pipWindow as unknown as Window);
      await firstOpen;
    });
  });

  it("restores normal state on pagehide and ignores stale window events", async () => {
    const firstWindow = new PictureInPictureWindowStub();
    const secondWindow = new PictureInPictureWindowStub();
    const requestWindow = setDocumentPictureInPictureApi(
      vi
        .fn()
        .mockResolvedValueOnce(firstWindow as unknown as Window)
        .mockResolvedValueOnce(secondWindow as unknown as Window),
    );
    const hook = renderHook(() =>
      useDocumentPictureInPicture({
        hostRef: createHostRef(),
        onError: vi.fn(),
      }),
    );
    await waitFor(() => expect(hook.result.current.isSupported).toBe(true));

    await act(() => hook.result.current.open());
    act(() => firstWindow.dispatchEvent(new Event("pagehide")));
    expect(hook.result.current.pipWindow).toBeNull();

    await act(() => hook.result.current.open());
    act(() => firstWindow.dispatchEvent(new Event("pagehide")));
    expect(hook.result.current.pipWindow).toBe(secondWindow);
    expect(requestWindow).toHaveBeenCalledTimes(2);
  });

  it("focuses the opener and closes the PiP window on return", async () => {
    const pipWindow = new PictureInPictureWindowStub();
    setDocumentPictureInPictureApi(async () => pipWindow as unknown as Window);
    const hook = renderHook(() =>
      useDocumentPictureInPicture({
        hostRef: createHostRef(),
        onError: vi.fn(),
      }),
    );
    await waitFor(() => expect(hook.result.current.isSupported).toBe(true));
    await act(() => hook.result.current.open());

    act(() => hook.result.current.returnToOpener());

    expect(window.focus).toHaveBeenCalled();
    expect(pipWindow.close).toHaveBeenCalledOnce();
    expect(hook.result.current.pipWindow).toBeNull();
  });

  it("surfaces request failures and closes an active window on unmount", async () => {
    const requestError = new DOMException("Blocked", "NotAllowedError");
    setDocumentPictureInPictureApi(async () => {
      throw requestError;
    });
    const onError = vi.fn();
    const failedHook = renderHook(() =>
      useDocumentPictureInPicture({
        hostRef: createHostRef(),
        onError,
      }),
    );
    await waitFor(() =>
      expect(failedHook.result.current.isSupported).toBe(true),
    );

    await act(() => failedHook.result.current.open());
    expect(onError).toHaveBeenCalledWith(requestError);
    expect(failedHook.result.current.pipWindow).toBeNull();

    failedHook.unmount();
    const pipWindow = new PictureInPictureWindowStub();
    setDocumentPictureInPictureApi(async () => pipWindow as unknown as Window);
    const activeHook = renderHook(() =>
      useDocumentPictureInPicture({
        hostRef: createHostRef(),
        onError: vi.fn(),
      }),
    );
    await waitFor(() =>
      expect(activeHook.result.current.isSupported).toBe(true),
    );
    await act(() => activeHook.result.current.open());

    activeHook.unmount();
    expect(pipWindow.close).toHaveBeenCalledOnce();
  });
});
