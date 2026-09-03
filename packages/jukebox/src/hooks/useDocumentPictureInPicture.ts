"use client";

import type { RefObject } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

const STYLESHEET_SELECTOR = 'link[rel~="stylesheet"], style';

function copyAttributes(source: Element, target: Element) {
  for (const attributeName of target.getAttributeNames()) {
    target.removeAttribute(attributeName);
  }
  for (const attribute of source.attributes) {
    target.setAttribute(attribute.name, attribute.value);
  }
}

export function preparePictureInPictureDocument(
  sourceDocument: Document,
  pictureInPictureDocument: Document,
): { portalContainer: HTMLDivElement; cleanup: () => void } {
  pictureInPictureDocument.head.replaceChildren();
  pictureInPictureDocument.body.replaceChildren();

  const charset = pictureInPictureDocument.createElement("meta");
  charset.setAttribute("charset", "utf-8");
  pictureInPictureDocument.head.append(charset);

  const viewport = pictureInPictureDocument.createElement("meta");
  viewport.name = "viewport";
  viewport.content = "width=device-width, initial-scale=1";
  pictureInPictureDocument.head.append(viewport);

  const base = pictureInPictureDocument.createElement("base");
  base.href = sourceDocument.baseURI;
  pictureInPictureDocument.head.append(base);

  let stylesheetCopies: Element[] = [];
  const syncStylesheets = () => {
    stylesheetCopies.forEach((node) => node.remove());
    stylesheetCopies = Array.from(
      sourceDocument.head.querySelectorAll(STYLESHEET_SELECTOR),
      (stylesheet) => stylesheet.cloneNode(true) as Element,
    );
    pictureInPictureDocument.head.append(...stylesheetCopies);
  };

  const syncDocumentShell = () => {
    copyAttributes(
      sourceDocument.documentElement,
      pictureInPictureDocument.documentElement,
    );
    copyAttributes(sourceDocument.body, pictureInPictureDocument.body);
    pictureInPictureDocument.title = sourceDocument.title;
    pictureInPictureDocument.body.style.margin = "0";
    pictureInPictureDocument.body.style.width = "100vw";
    pictureInPictureDocument.body.style.height = "100vh";
    pictureInPictureDocument.body.style.overflow = "hidden";
  };

  syncStylesheets();
  syncDocumentShell();

  const portalContainer = pictureInPictureDocument.createElement("div");
  portalContainer.dataset.lyricovaPictureInPicture = "true";
  portalContainer.style.position = "relative";
  portalContainer.style.width = "100vw";
  portalContainer.style.height = "100vh";
  portalContainer.style.overflow = "hidden";
  pictureInPictureDocument.body.append(portalContainer);

  const MutationObserverConstructor =
    sourceDocument.defaultView?.MutationObserver ?? MutationObserver;
  const headObserver = new MutationObserverConstructor(() => {
    syncStylesheets();
    pictureInPictureDocument.title = sourceDocument.title;
  });
  headObserver.observe(sourceDocument.head, {
    attributes: true,
    childList: true,
    characterData: true,
    subtree: true,
  });

  const shellObserver = new MutationObserverConstructor(syncDocumentShell);
  shellObserver.observe(sourceDocument.documentElement, {
    attributes: true,
  });
  shellObserver.observe(sourceDocument.body, {
    attributes: true,
  });

  return {
    portalContainer,
    cleanup: () => {
      headObserver.disconnect();
      shellObserver.disconnect();
    },
  };
}

interface PictureInPictureSession {
  cleanup: () => void;
  onPageHide: () => void;
  pipWindow: Window;
  portalContainer: HTMLDivElement;
}

interface UseDocumentPictureInPictureOptions {
  hostRef: RefObject<HTMLElement | null>;
  onError: (error: unknown) => void;
}

export function useDocumentPictureInPicture({
  hostRef,
  onError,
}: UseDocumentPictureInPictureOptions) {
  const [isSupported, setIsSupported] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [session, setSession] = useState<PictureInPictureSession | null>(null);
  const isMountedRef = useRef(false);
  const isOpeningRef = useRef(false);
  const sessionRef = useRef<PictureInPictureSession | null>(null);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const clearSession = useCallback((pipWindow: Window) => {
    const currentSession = sessionRef.current;
    if (!currentSession || currentSession.pipWindow !== pipWindow) return;

    currentSession.pipWindow.removeEventListener(
      "pagehide",
      currentSession.onPageHide,
    );
    currentSession.cleanup();
    sessionRef.current = null;
    if (isMountedRef.current) setSession(null);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    setIsSupported(
      window.isSecureContext && "documentPictureInPicture" in window,
    );

    return () => {
      isMountedRef.current = false;
      const currentSession = sessionRef.current;
      if (!currentSession) return;

      currentSession.pipWindow.removeEventListener(
        "pagehide",
        currentSession.onPageHide,
      );
      currentSession.cleanup();
      sessionRef.current = null;
      if (!currentSession.pipWindow.closed) currentSession.pipWindow.close();
    };
  }, []);

  const open = useCallback(async () => {
    if (
      isOpeningRef.current ||
      sessionRef.current ||
      !window.isSecureContext ||
      !("documentPictureInPicture" in window)
    ) {
      return;
    }

    isOpeningRef.current = true;
    setIsOpening(true);
    let requestedWindow: Window | null = null;

    try {
      const bounds = hostRef.current?.getBoundingClientRect();
      const width = bounds ? Math.round(bounds.width) : 0;
      const height = bounds ? Math.round(bounds.height) : 0;
      const size =
        width > 0 && height > 0
          ? {
              width,
              height,
            }
          : {};

      requestedWindow =
        await window.documentPictureInPicture.requestWindow({
          ...size,
          disallowReturnToOpener: true,
        });

      if (!isMountedRef.current) {
        requestedWindow.close();
        return;
      }

      const preparedDocument = preparePictureInPictureDocument(
        document,
        requestedWindow.document,
      );
      const onPageHide = () => clearSession(requestedWindow!);
      const nextSession: PictureInPictureSession = {
        ...preparedDocument,
        onPageHide,
        pipWindow: requestedWindow,
      };

      sessionRef.current = nextSession;
      requestedWindow.addEventListener("pagehide", onPageHide, { once: true });
      setSession(nextSession);
    } catch (error) {
      if (requestedWindow && !requestedWindow.closed) requestedWindow.close();
      onErrorRef.current(error);
    } finally {
      isOpeningRef.current = false;
      if (isMountedRef.current) setIsOpening(false);
    }
  }, [clearSession, hostRef]);

  const returnToOpener = useCallback(() => {
    const currentSession = sessionRef.current;
    if (!currentSession) return;

    window.focus();
    if (!currentSession.pipWindow.closed) currentSession.pipWindow.close();
    clearSession(currentSession.pipWindow);
  }, [clearSession]);

  return {
    isOpening,
    isSupported,
    open,
    pipWindow: session?.pipWindow ?? null,
    portalContainer: session?.portalContainer ?? null,
    returnToOpener,
  };
}
