interface DocumentPictureInPictureEventInit extends EventInit {
  window: Window;
}

interface DocumentPictureInPictureOptions {
  disallowReturnToOpener?: boolean;
  height?: number;
  preferInitialWindowPlacement?: boolean;
  width?: number;
}

interface DocumentPictureInPictureEventMap {
  enter: DocumentPictureInPictureEvent;
}

interface DocumentPictureInPicture extends EventTarget {
  onenter:
    | ((
        this: DocumentPictureInPicture,
        event: DocumentPictureInPictureEvent,
      ) => unknown)
    | null;
  readonly window: Window;
  requestWindow(options?: DocumentPictureInPictureOptions): Promise<Window>;
  addEventListener<K extends keyof DocumentPictureInPictureEventMap>(
    type: K,
    listener: (
      this: DocumentPictureInPicture,
      event: DocumentPictureInPictureEventMap[K],
    ) => unknown,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener<K extends keyof DocumentPictureInPictureEventMap>(
    type: K,
    listener: (
      this: DocumentPictureInPicture,
      event: DocumentPictureInPictureEventMap[K],
    ) => unknown,
    options?: boolean | EventListenerOptions,
  ): void;
}

interface DocumentPictureInPictureEvent extends Event {
  readonly window: Window;
}

interface Window {
  readonly documentPictureInPicture: DocumentPictureInPicture;
}
