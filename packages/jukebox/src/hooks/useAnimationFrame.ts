import { useEffect, useRef } from "react";

/**
 * Run a callback on the next animation frame and continue while active.
 *
 * Changing `refreshKey` schedules a one-shot frame even while inactive, which
 * allows paused media seeks to refresh their derived UI state.
 */
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
