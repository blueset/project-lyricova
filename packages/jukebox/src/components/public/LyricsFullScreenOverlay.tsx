import {
  ComponentProps,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { useNamedState } from "../../hooks/useNamedState";
import { useAppContext } from "./AppContext";
import { Button } from "@lyricova/components/components/ui/button";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@lyricova/components/components/ui/toggle-group";
import { cn } from "@lyricova/components/utils";
import {
  Maximize,
  Rewind,
  Forward,
  Pause,
  Play,
  FastForward,
} from "lucide-react";

interface SO extends ScreenOrientation {
  lock(orientation: string): Promise<void>;
}

export function LyricsFullScreenOverlay({
  children,
}: {
  children?: ReactNode;
}) {
  const { playerRef } = useAppContext();
  const [isPlaying, setIsPlaying] = useNamedState(
    !playerRef.current?.paused,
    "isPlaying"
  );
  const [isVisible, setIsVisible] = useNamedState(false, "isVisible");
  const [fullscreenMode, setFullscreenMode] = useNamedState<
    "web" | "0" | "90" | "180" | "270"
  >("web", "fullscreenMode");
  const toggleVisibleTimeout = useRef<number | null>(null);
  const lastClickTime = useRef<number>(0);
  const onPlay = useCallback(() => {
    setIsPlaying(true);
  }, [setIsPlaying]);
  const onPause = useCallback(() => {
    setIsPlaying(false);
  }, [setIsPlaying]);

  const togglePlay = useCallback(
    (event: { stopPropagation: () => void }) => {
      event.stopPropagation();
      if (!playerRef.current) {
        return;
      }
      if (playerRef.current.paused) {
        playerRef.current.play();
      } else {
        playerRef.current.pause();
      }
    },
    [playerRef]
  );

  const rewind5 = useCallback(
    (event: { stopPropagation: () => void }) => {
      console.log("rewind5");
      event.stopPropagation();
      if (!playerRef.current) {
        return;
      }
      playerRef.current.currentTime -= 5;
    },
    [playerRef]
  );
  const forward5 = useCallback(
    (event: { stopPropagation: () => void }) => {
      event.stopPropagation();
      if (!playerRef.current) {
        return;
      }
      playerRef.current.currentTime += 5;
    },
    [playerRef]
  );

  const toggleVisible: ComponentProps<"div">["onClick"] = useCallback(
    (event) => {
      const now = performance.now();
      if (now - lastClickTime.current < 500) {
        // if double click left half
        if (event.clientX < event.currentTarget.clientWidth / 2) {
          rewind5(event);
        } else {
          forward5(event);
        }
      } else {
        setIsVisible((v) => {
          if (toggleVisibleTimeout.current) {
            window.clearTimeout(toggleVisibleTimeout.current);
          }
          if (!v) {
            toggleVisibleTimeout.current = window.setTimeout(() => {
              setIsVisible(false);
              toggleVisibleTimeout.current = null;
            }, 2000);
          }
          return !v;
        });
      }
      lastClickTime.current = now;
    },
    [forward5, rewind5, setIsVisible]
  );

  useEffect(() => {
    const player = playerRef.current;
    if (!player) {
      return;
    }
    player.addEventListener("play", onPlay);
    player.addEventListener("pause", onPause);
    return () => {
      player.removeEventListener("play", onPlay);
      player.removeEventListener("pause", onPause);
    };
  }, [onPause, onPlay, playerRef]);

  useEffect(() => {
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setFullscreenMode("web");
      }
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, [setFullscreenMode]);

  return (
    <div
      className={cn(
        "absolute inset-0 bg-black/50 transition-opacity duration-500 flex flex-row items-center justify-evenly",
        isVisible ? "opacity-100" : "opacity-0"
      )}
      onClick={toggleVisible}
    >
      <div
        className={cn(
          "fixed inset-0",
          isVisible ? "pointer-events-auto" : "pointer-events-none"
        )}
      >
        {children}
        <div className="absolute top-0 left-0 p-2">
          <ToggleGroup
            className="z-10"
            type="single"
            value={fullscreenMode}
            onClick={(e) => e.stopPropagation()}
            aria-label="Fullscreen"
            onValueChange={async (
              value: "web" | "0" | "90" | "180" | "270"
            ) => {
              if (value) {
                if (value === "web") {
                  await document?.exitFullscreen?.().catch(() => {
                    /* No-op */
                  });
                  screen?.orientation?.unlock?.();
                } else {
                  await document.body?.requestFullscreen?.();
                  if (value === "0") {
                    (screen?.orientation as SO)
                      ?.lock?.("portrait-primary")
                      .catch(() => {
                        /* No-op */
                      });
                  } else if (value === "90") {
                    (screen?.orientation as SO)
                      ?.lock?.("landscape-primary")
                      .catch(() => {
                        /* No-op */
                      });
                  } else if (value === "180") {
                    (screen?.orientation as SO)
                      ?.lock?.("portrait-secondary")
                      .catch(() => {
                        /* No-op */
                      });
                  } else if (value === "270") {
                    (screen?.orientation as SO)
                      ?.lock?.("landscape-secondary")
                      .catch(() => {
                        /* No-op */
                      });
                  }
                }
                setFullscreenMode(value);
              }
            }}
          >
            <ToggleGroupItem value="web" aria-label="Fullscreen">
              <Maximize />
            </ToggleGroupItem>
            <ToggleGroupItem value="0">0°</ToggleGroupItem>
            <ToggleGroupItem value="90">90°</ToggleGroupItem>
            <ToggleGroupItem value="180">180°</ToggleGroupItem>
            <ToggleGroupItem value="270">270°</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>
      <Button
        variant="ghostBright"
        size="icon"
        className={cn(
          "text-2xl size-14 bg-black/40 rounded-full z-10",
          isVisible ? "pointer-events-auto" : "pointer-events-none"
        )}
        onClick={rewind5}
        aria-label="Rewind 5 seconds"
      >
        <Rewind className="size-6" />
      </Button>
      <Button
        variant="ghostBright"
        size="icon"
        className={cn(
          "size-20 text-4xl bg-black/40 rounded-full z-10 hover:bg-foreground/50",
          isVisible ? "pointer-events-auto" : "pointer-events-none"
        )}
        onClick={togglePlay}
        aria-label={!isPlaying ? "Play" : "Pause"}
      >
        {!isPlaying ? (
          <Play className="size-10" />
        ) : (
          <Pause className="size-10" />
        )}
      </Button>
      <Button
        variant="ghostBright"
        size="icon"
        className={cn(
          "text-2xl size-14 bg-black/40 rounded-full z-10",
          isVisible ? "pointer-events-auto" : "pointer-events-none"
        )}
        onClick={forward5}
        aria-label="Forward 5 seconds"
      >
        <FastForward className="size-6" />
      </Button>
    </div>
  );
}
