import type { ForwardedRef, RefCallback } from "react";
import { useCallback, useImperativeHandle, useRef } from "react";
import type { PlaybackAnimationController, PlaybackSnapshot } from "./types";

/** Apply a media snapshot to a Web Animation without replaying a completed one. */
function synchronizeAnimation(
  animation: Animation,
  snapshot: PlaybackSnapshot,
) {
  animation.playbackRate = snapshot.playbackRate;
  animation.currentTime = snapshot.currentTime * 1000;
  const effectEnd = animation.effect?.getComputedTiming().endTime;
  const isComplete =
    typeof effectEnd === "number" &&
    animation.currentTime !== null &&
    animation.currentTime >= effectEnd;
  if (snapshot.state === "playing" && !isComplete) {
    animation.play();
  } else {
    animation.pause();
  }
}

/**
 * Bind a Web Animation to an imperative media playback controller.
 *
 * The returned ref callback creates one animation for the mounted element,
 * applies the latest snapshot again after the animation becomes ready, and
 * cancels the animation during ref cleanup or unmount.
 */
export function useWebAnimationController<TElement extends Element>(
  forwardedRef: ForwardedRef<PlaybackAnimationController>,
  createAnimation: (element: TElement) => Animation,
): RefCallback<TElement> {
  const animationRef = useRef<Animation | null>(null);
  const snapshotRef = useRef<PlaybackSnapshot | null>(null);

  useImperativeHandle(
    forwardedRef,
    () => ({
      synchronize(snapshot) {
        snapshotRef.current = snapshot;
        if (animationRef.current) {
          synchronizeAnimation(animationRef.current, snapshot);
        }
      },
    }),
    [],
  );

  return useCallback(
    (element: TElement | null) => {
      if (!element) return;

      const animation = createAnimation(element);
      animation.pause();
      animationRef.current = animation;
      if (snapshotRef.current) {
        synchronizeAnimation(animation, snapshotRef.current);
      }

      void animation.ready
        .then(() => {
          if (animationRef.current === animation && snapshotRef.current) {
            synchronizeAnimation(animation, snapshotRef.current);
          }
        })
        .catch((error: unknown) => {
          if (!(error instanceof DOMException && error.name === "AbortError")) {
            console.error("Web animation failed to become ready", error);
          }
        });

      return () => {
        if (animationRef.current === animation) {
          animationRef.current = null;
        }
        animation.cancel();
      };
    },
    [createAnimation],
  );
}
