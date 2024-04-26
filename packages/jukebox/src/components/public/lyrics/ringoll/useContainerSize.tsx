import { RefObject, useLayoutEffect, useState } from "react";

export function useContainerSize({
  containerRef,
}: {
  containerRef: RefObject<HTMLDivElement>;
}) {
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    // console.log("containerResize 1", rect);
    setContainerSize({ width: rect.width, height: rect.height });

    const observer = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      // console.log("containerResize 2", rect, entries);
      if (rect.width !== 0 && rect.height !== 0) {
        setContainerSize({ width: rect.width, height: rect.height });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef]);

  return containerSize;
}