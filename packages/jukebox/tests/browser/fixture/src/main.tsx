import {
  forwardRef,
  StrictMode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createRoot } from "react-dom/client";
import gsap from "gsap";
import { usePlayerLyricsState } from "../../../../src/hooks/usePlayerLyricsState";
import { readPlaybackSnapshot } from "../../../../src/hooks/useMediaClock";
import { useTrackwiseTimelineControl } from "../../../../src/hooks/useTrackwiseTimelineControl";
import type { PlaybackAnimationController } from "../../../../src/hooks/types";
import { useWebAnimationController } from "../../../../src/hooks/useWebAnimationController";
import { useScrollOffset } from "../../../../src/components/public/lyrics/components/useScrollOffset";

function NativeScrollHarness() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(200);
  const { scrollOffset, scrollContentHeight, isActiveScroll, isUserScrolling } =
    useScrollOffset({
      containerRef,
      containerSize: { width: 300, height: containerHeight },
      rowAccumulateHeight: [0, 100, 200, 300],
      startRow: 1,
      endRow: 2,
      align: "center",
      alignAnchor: 0.5,
    });

  return (
    <>
      <button type="button" onClick={() => setContainerHeight(300)}>
        resize-native-scroller
      </button>
      <div
        ref={containerRef}
        data-testid="native-scroller"
        data-active-scroll={isActiveScroll}
        data-user-scrolling={isUserScrolling}
        style={{
          height: containerHeight,
          overflowY: "auto",
          overscrollBehaviorY: "contain",
          touchAction: "pan-y",
          width: 300,
        }}
      >
        <div style={{ height: scrollContentHeight, position: "relative" }}>
          <div
            data-testid="sticky-lyrics-viewport"
            style={{ height: containerHeight, position: "sticky", top: 0 }}
          >
            <output data-testid="native-scroll-offset">{scrollOffset}</output>
          </div>
        </div>
      </div>
    </>
  );
}

const AnimatedNode = forwardRef<
  PlaybackAnimationController,
  { version: number }
>(function AnimatedNode({ version }, ref) {
  const createAnimation = useCallback(
    (element: HTMLSpanElement) =>
      element.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 10_000,
        fill: "both",
        id: `waapi-${version}`,
      }),
    [version],
  );
  const animationRef = useWebAnimationController(ref, createAnimation);
  return (
    <span data-testid="waapi-target" ref={animationRef}>
      animated
    </span>
  );
});

function App() {
  const transportRef = useRef({
    currentTime: 0,
    duration: 30,
    paused: true,
    playbackRate: 1,
  });
  const playerRef = useRef<HTMLAudioElement>(null!);
  const bindPlayer = useCallback((player: HTMLAudioElement | null) => {
    playerRef.current = player as HTMLAudioElement;
    if (!player) return;
    Object.defineProperties(player, {
      currentTime: {
        configurable: true,
        get: () => transportRef.current.currentTime,
        set: (value: number) => {
          transportRef.current.currentTime = value;
        },
      },
      duration: {
        configurable: true,
        get: () => transportRef.current.duration,
      },
      ended: {
        configurable: true,
        get: () => false,
      },
      paused: {
        configurable: true,
        get: () => transportRef.current.paused,
      },
      playbackRate: {
        configurable: true,
        get: () => transportRef.current.playbackRate,
        set: (value: number) => {
          transportRef.current.playbackRate = value;
        },
      },
      readyState: {
        configurable: true,
        get: () => HTMLMediaElement.HAVE_ENOUGH_DATA,
      },
    });
  }, []);

  const { currentFrame, playerState } = usePlayerLyricsState(
    [
      { start: 1, data: "first" },
      { start: 5, data: "second" },
      { start: 9, data: "third" },
    ],
    playerRef,
  );
  const [mounted, setMounted] = useState(false);
  const [version, setVersion] = useState(1);
  const animationControllerRef = useRef<PlaybackAnimationController>(null);

  useEffect(() => {
    const player = playerRef.current;
    if (mounted && player) {
      animationControllerRef.current?.synchronize(readPlaybackSnapshot(player));
    }
  }, [currentFrame, mounted, playerState]);

  const gsapTargetRef = useRef<HTMLDivElement>(null);
  const [timeline, setTimeline] = useState<gsap.core.Timeline | null>(null);
  useLayoutEffect(() => {
    const target = gsapTargetRef.current;
    if (!target) return;
    const nextTimeline = gsap
      .timeline({ paused: true })
      .fromTo(target, { x: 0 }, { x: 100, duration: 10, ease: "none" }, 0);
    setTimeline(nextTimeline);
    return () => nextTimeline.kill();
  }, []);
  useTrackwiseTimelineControl(playerRef, playerState, timeline);

  const dispatch = (event: string) => {
    playerRef.current.dispatchEvent(new Event(event));
  };
  const seek = (currentTime: number) => {
    transportRef.current.currentTime = currentTime;
    dispatch("seeking");
    dispatch("seeked");
  };

  return (
    <main>
      <NativeScrollHarness />
      <audio ref={bindPlayer} />
      <output data-testid="frame">{currentFrame?.data ?? "none"}</output>
      <button type="button" onClick={() => seek(6)}>
        seek-six
      </button>
      <button type="button" onClick={() => seek(0.5)}>
        seek-before
      </button>
      <button
        type="button"
        onClick={() => {
          transportRef.current.paused = false;
          dispatch("play");
        }}
      >
        play
      </button>
      <button
        type="button"
        onClick={() => {
          transportRef.current.paused = true;
          dispatch("pause");
        }}
      >
        pause
      </button>
      <button
        type="button"
        onClick={() => {
          transportRef.current.playbackRate = 2;
          dispatch("ratechange");
        }}
      >
        rate-two
      </button>
      <button type="button" onClick={() => setMounted((value) => !value)}>
        toggle-animation
      </button>
      <button type="button" onClick={() => setVersion((value) => value + 1)}>
        replace-animation
      </button>
      {mounted && (
        <AnimatedNode ref={animationControllerRef} version={version} />
      )}
      <div
        data-testid="gsap-target"
        ref={gsapTargetRef}
        style={{ width: 10, height: 10 }}
      />
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
