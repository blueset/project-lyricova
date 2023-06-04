import {
  ComponentProps,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { useNamedState } from "../../frontendUtils/hooks";
import { useAppContext } from "./AppContext";
import {
  Button,
  ToggleButtonGroup,
  IconButton,
  Tooltip,
  styled,
  ToggleButton,
} from "@mui/material";
import Replay5Icon from "@mui/icons-material/Replay5";
import Forward5Icon from "@mui/icons-material/Forward5";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import FullscreenIcon from "@mui/icons-material/Fullscreen";

const ShadeDiv = styled("div")`
  position: absolute;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  transition: opacity 0.5s ease-out;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-evenly;
`;

const FullScreenControlDiv = styled("div")`
  position: absolute;
  top: 0;
  left: 0;
  padding: 0.5rem;
`;

export function LyricsFullScreenOverlay({
  children,
}: {
  children?: ReactNode;
}) {
  const { playerRef } = useAppContext();
  const [isPlaying, setIsPlaying] = useNamedState(
    !playerRef.current?.paused ?? false,
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

  const toggleVisible: ComponentProps<typeof ShadeDiv>["onClick"] = useCallback(
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
    <ShadeDiv
      sx={{
        opacity: isVisible ? 1 : 0,
      }}
      onClick={toggleVisible}
    >
      <div
        style={{
          pointerEvents: isVisible ? "auto" : "none",
          position: "fixed",
          inset: 0,
        }}
      >
        {children}
        <FullScreenControlDiv>
          <ToggleButtonGroup
            aria-label="Fullscreen options"
            exclusive
            onChange={async (evt, value) => {
              evt.stopPropagation();
              if (value) {
                if (value === "web") {
                  await document?.exitFullscreen?.().catch(() => {
                    /* No-op */
                  });
                  screen?.orientation?.unlock?.();
                } else {
                  await document.body?.requestFullscreen?.();
                  if (value === "0") {
                    screen?.orientation
                      ?.lock?.("portrait-primary")
                      .catch(() => {
                        /* No-op */
                      });
                  } else if (value === "90") {
                    screen?.orientation
                      ?.lock?.("landscape-primary")
                      .catch(() => {
                        /* No-op */
                      });
                  } else if (value === "180") {
                    screen?.orientation
                      ?.lock?.("portrait-secondary")
                      .catch(() => {
                        /* No-op */
                      });
                  } else if (value === "270") {
                    screen?.orientation
                      ?.lock?.("landscape-secondary")
                      .catch(() => {
                        /* No-op */
                      });
                  }
                }
                setFullscreenMode(value);
              }
            }}
            value={fullscreenMode}
          >
            <ToggleButton value="web">
              <FullscreenIcon />
            </ToggleButton>
            <ToggleButton value="0">0°</ToggleButton>
            <ToggleButton value="90">90°</ToggleButton>
            <ToggleButton value="180">180°</ToggleButton>
            <ToggleButton value="270">270°</ToggleButton>
          </ToggleButtonGroup>
        </FullScreenControlDiv>
      </div>
      <IconButton
        aria-label="Rewind 5 seconds"
        sx={{
          fontSize: "2em",
          backgroundColor: "rgba(0, 0, 0, 0.4)",
          pointerEvents: isVisible ? "auto" : "none",
        }}
        onClick={rewind5}
      >
        <Replay5Icon fontSize="inherit" />
      </IconButton>
      <IconButton
        aria-label={!isPlaying ? "Play" : "Pause"}
        onClick={togglePlay}
        sx={{
          fontSize: "4em",
          backgroundColor: "rgba(0, 0, 0, 0.4)",
          pointerEvents: isVisible ? "auto" : "none",
        }}
      >
        {!isPlaying ? (
          <PlayArrowIcon fontSize="inherit" />
        ) : (
          <PauseIcon fontSize="inherit" />
        )}
      </IconButton>
      <IconButton
        aria-label="Forward 5 seconds"
        sx={{
          fontSize: "2em",
          backgroundColor: "rgba(0, 0, 0, 0.4)",
          pointerEvents: isVisible ? "auto" : "none",
        }}
        onClick={forward5}
      >
        <Forward5Icon fontSize="inherit" />
      </IconButton>
    </ShadeDiv>
  );
}
