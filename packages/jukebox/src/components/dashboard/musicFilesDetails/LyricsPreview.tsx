import { useEffect, useMemo, useRef } from "react";
import { Lyrics, LyricsLine } from "lyrics-kit";
import { makeStyles } from "@material-ui/core/styles";
import { PlayerLyricsKeyframe, usePlayerLyricsState } from "../../../frontendUtils/hooks";
import clsx from "clsx";
import FuriganaLyricsLine from "../../FuriganaLyricsLine";
import gsap from "gsap";
import { measureTextWidths } from "../../../frontendUtils/measure";

type Timeline = gsap.core.Timeline;

const useStyle = makeStyles((theme) => ({
  lyricsContainer: {
    height: "calc(100vh - 20rem)",
    overflow: "scroll",
    "&:before, &:after": {
      content: "\"\"",
      height: "50%",
      display: "block",
    }
  },
  player: {
    width: "100%",
  },
  line: {
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(2),
    textAlign: "center",
    fontSize: "1inrem",
    minHeight: "1.5em",
  },
  activeLine: {
    color: theme.palette.secondary.main,
    fontWeight: "bold",
    "& > .furigana": {
      display: "inline",
      backgroundImage: `linear-gradient(0deg, ${theme.palette.common.black}, ${theme.palette.common.black})`,
      backgroundRepeat: "no-repeat",
      backgroundSize: "0% 100%",
    },
  },
  translation: {
    fontSize: "0.8em",
  },
}));

interface Props {
  lyrics: Lyrics;
  fileId: number;
}

export default function LyricsPreview({ lyrics, fileId }: Props) {
  const playerRef = useRef<HTMLAudioElement>();
  const containerRef = useRef<HTMLDivElement>();
  const currentLineRef = useRef<HTMLDivElement>();
  const styles = useStyle();

  const keyFrames: PlayerLyricsKeyframe<LyricsLine>[] = useMemo(() => (lyrics?.lines ?? []).map(v => ({
    start: v.position,
    data: v
  })), [lyrics]);
  const { playerState, currentFrame, currentFrameId, endTime } = usePlayerLyricsState(keyFrames, playerRef);

  const timelineRef = useRef<Timeline>();
  useEffect(() => {
    if (timelineRef.current) timelineRef.current.kill();
    const tl = gsap.timeline({ paused: playerState.state === "paused" });
    if (currentLineRef.current) {
      const target = currentLineRef.current.querySelector(".furigana") as HTMLDivElement;
      if (currentFrame.data.attachments?.timeTag) {
        target.style.backgroundSize = "0% 100%";
        const lengths = measureTextWidths(target);
        const length = lengths[lengths.length - 1];
        const percentages = lengths.map(v => v / length * 100);
        const tags = currentFrame.data.attachments.timeTag.tags;
        tags.forEach((v, idx) => {
          const duration = idx > 0 ? v.timeTag - tags[idx - 1].timeTag : v.timeTag;
          const start = idx > 0 ? tags[idx - 1].timeTag : 0;
          let percentage = 0;
          if (v.index > 0) percentage = percentages[v.index - 1];
          tl.to(target, {
            backgroundSize: `${percentage}% 100%`,
            ease: "none",
            duration
          }, start);
        });
      }
    }
    timelineRef.current = tl;
  }, [currentFrame, endTime, playerState.state]);

  useEffect(() => {
    if (currentLineRef.current && containerRef) {
      const curTop = currentLineRef.current.offsetTop -  containerRef.current.offsetTop;
      containerRef.current.scrollTo({
        top: curTop - containerRef.current.offsetHeight / 2 + currentLineRef.current.offsetHeight / 2,
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
        const inlineProgress = (now - playerState.startingAt) / 1000 - startTime;
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

  return <div>
    <audio ref={playerRef} src={`/api/files/${fileId}/file`} controls className={styles.player} />
    <div className={styles.lyricsContainer} ref={containerRef}>
      {(lyrics?.lines ?? []).map((v, idx) => (
        <div key={idx}
             className={clsx(styles.line, idx === currentFrameId && styles.activeLine)}
             ref={idx === currentFrameId ? currentLineRef : null}
        >
          <div className="furigana">
            <FuriganaLyricsLine lyricsKitLine={v} />
          </div>
          <div className={styles.translation}>{v.attachments.translation()}</div>
        </div>
      ))}
    </div>
  </div>;
}