import { useEffect, useMemo, useRef } from "react";
import type { Lyrics, LyricsLine } from "lyrics-kit/core";
import type { PlayerLyricsKeyframe } from "../../../frontendUtils/hooks";
import { usePlayerLyricsState } from "../../../frontendUtils/hooks";
import FuriganaLyricsLine from "../../FuriganaLyricsLine";
import gsap from "gsap";
import { measureTextWidths } from "../../../frontendUtils/measure";
import { Box } from "@mui/material";

type Timeline = gsap.core.Timeline;

interface Props {
  lyrics: Lyrics;
  fileId: number;
}

export default function LyricsPreview({ lyrics, fileId }: Props) {
  const playerRef = useRef<HTMLAudioElement>();
  const containerRef = useRef<HTMLDivElement>();
  const currentLineRef = useRef<HTMLDivElement>();

  const keyFrames: PlayerLyricsKeyframe<LyricsLine>[] = useMemo(
    () =>
      (lyrics?.lines ?? []).map((v) => ({
        start: v.position,
        data: v,
      })),
    [lyrics]
  );
  const { playerState, currentFrame, currentFrameId, endTime } =
    usePlayerLyricsState(keyFrames, playerRef);

  const timelineRef = useRef<Timeline>();
  useEffect(() => {
    if (timelineRef.current) timelineRef.current.kill();
    const tl = gsap.timeline({ paused: playerState.state === "paused" });
    if (currentLineRef.current) {
      const target = currentLineRef.current.querySelector(
        ".furigana"
      ) as HTMLDivElement;
      if (currentFrame.data.attachments?.timeTag) {
        target.style.backgroundSize = "0% 100%";
        const lengths = measureTextWidths(target);
        const length = lengths[lengths.length - 1];
        const percentages = lengths.map((v) => (v / length) * 100);
        const tags = currentFrame.data.attachments.timeTag.tags;
        tags.forEach((v, idx) => {
          const duration =
            idx > 0 ? v.timeTag - tags[idx - 1].timeTag : v.timeTag;
          const start = idx > 0 ? tags[idx - 1].timeTag : 0;
          let percentage = 0;
          if (v.index > 0) percentage = percentages[v.index - 1];
          tl.to(
            target,
            {
              backgroundSize: `${percentage}% 100%`,
              ease: "none",
              duration,
            },
            start
          );
        });
      }
    }
    timelineRef.current = tl;
  }, [currentFrame, endTime, playerState.state]);

  useEffect(() => {
    if (currentLineRef.current) {
      currentLineRef.current.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
    }
  }, [currentFrame]);

  // Controls the progress of timeline
  useEffect(() => {
    const timeline = timelineRef.current;
    const now = performance.now();
    const startTime = currentFrame?.start ?? 0;

    if (timeline) {
      if (playerState.state === "playing") {
        const inlineProgress =
          (now - playerState.startingAt) / 1000 - startTime;
        timeline.seek(inlineProgress);
        timeline.play();
      } else {
        const inlineProgress = playerState.progress - startTime;
        timeline.pause();
        timeline.seek(inlineProgress);
      }
    }
    // Removing currentFrame?.start as we don’t want it to trigger for every line update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerState]);

  return (
    <div>
      <audio
        ref={playerRef}
        src={`/api/files/${fileId}/file`}
        controls
        style={{ width: "100%" }}
      />
      <Box
        sx={{
          height: "calc(100vh - 15rem)",
          overflow: "scroll",
          "&:before, &:after": {
            content: '""',
            height: "50%",
            display: "block",
          },
        }}
        ref={containerRef}
      >
        {(lyrics?.lines ?? []).map((v, idx) => (
          <Box
            key={idx}
            sx={[
              {
                color: "text.secondary",
                marginBottom: 2,
                textAlign: "center",
                fontSize: "1rem",
                minHeight: "1.5em",
              },
              idx == currentFrameId && {
                color: "secondary.main",
                fontWeight: "bold",
                "& > .furigana": {
                  display: "inline",
                  backgroundImage: "linear-gradient(0deg, #923cbd, #923cbd)",
                  backgroundBlendMode: "difference",
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "0% 100%",
                },
              },
            ]}
            ref={idx === currentFrameId ? currentLineRef : null}
          >
            <div className="furigana">
              <FuriganaLyricsLine lyricsKitLine={v} />
            </div>
            <div style={{ fontSize: "0.8em" }}>
              {v.attachments.translation()}
            </div>
          </Box>
        ))}
      </Box>
    </div>
  );
}
