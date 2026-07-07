import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Observe an element's content-box size via the native `ResizeObserver`.
 *
 * Returns a callback `ref` to attach to the element and its current `width`/
 * `height`. A drop-in replacement for `react-measure`'s `<Measure bounds>` when
 * only the measured size is needed.
 */
export function useResizeObserver<T extends HTMLElement = HTMLElement>(): {
  ref: (node: T | null) => void;
  width: number;
  height: number;
} {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const observerRef = useRef<ResizeObserver | null>(null);

  const ref = useCallback((node: T | null) => {
    observerRef.current?.disconnect();
    if (!node) return;

    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setSize({ width: rect.width, height: rect.height });
    });
    observer.observe(node);
    observerRef.current = observer;
  }, []);

  useEffect(() => () => observerRef.current?.disconnect(), []);

  return { ref, width: size.width, height: size.height };
}
