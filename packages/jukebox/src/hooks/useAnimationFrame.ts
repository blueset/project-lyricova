import { useEffect, useRef } from "react";

export function useAnimationFrame(
  callback: (timestamp: number) => void,
  active: boolean,
  refreshKey?: unknown,
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    let animationFrame: number | null = null;
    let disposed = false;

    const onFrame = (timestamp: number) => {
      animationFrame = null;
      callbackRef.current(timestamp);
      if (active && !disposed) {
        animationFrame = requestAnimationFrame(onFrame);
      }
    };

    animationFrame = requestAnimationFrame(onFrame);
    return () => {
      disposed = true;
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
    };
  }, [active, refreshKey]);
}
