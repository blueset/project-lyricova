import { LyricsKitLyrics } from "../../../graphql/LyricsKitObjects";
import { useAppContext } from "../AppContext";
import { useLyricsState, usePlainPlayerLyricsState } from "../../../frontendUtils/hooks";
import { makeStyles } from "@material-ui/core";
import { useCallback, useEffect, useMemo, useRef } from "react";
import clsx from "clsx";
import gsap from "gsap";
import _ from "lodash";

interface Props {
  lyrics: LyricsKitLyrics;
}

const useStyle = makeStyles((theme) => {
  return {
    container: {
      width: "100%",
      height: "100%",
      overflow: "hidden",
      display: "flex",
      justifyContent: "center",
      flexDirection: "column",
      maskBorderImageSource: "linear-gradient(90deg, rgba(0,0,0,0) 0% , rgba(0,0,0,1) 49%, rgba(0,0,0,1) 51%, rgba(0,0,0,0) 100%)",
      maskBorderImageSlice: "0 49% fill",
      maskBorderImageWidth: "0 40px",
      maskBoxImageSource: "linear-gradient(90deg, rgba(0,0,0,0) 0% , rgba(0,0,0,1) 49%, rgba(0,0,0,1) 51%, rgba(0,0,0,0) 100%)",
      maskBoxImageSlice: "0 49% fill",
      maskBoxImageWidth: "0 40px",
    },
    lines: {
      whiteSpace: "nowrap",
      overflow: "hidden",
      transform: "rotate(-5deg)",
    },
    wrapper: {
      "&:before, &:after": {
        content: "\" \"",
        width: "50%",
        display: "inline-block",
      }
    },
    lyrics: {
      fontSize: "2em",
    },
    translations: {
      fontSize: "1.5em",
    },
    line: {
      fontWeight: 600,
      fontStyle: "italic",
      opacity: 0.5,
      paddingInlineEnd: "1em",
      "&.active": {
        opacity: 1,
      },
    },
  };
});

export function SlantedLyrics({ lyrics }: Props) {
  const { playerRef } = useAppContext();
  const styles = useStyle();
  const container = useRef<HTMLDivElement>();
  const wrapper = useRef<HTMLDivElement>();
  const currentLine = useRef<HTMLSpanElement>();
  const translationContainer = useRef<HTMLDivElement>();
  const translationWrapper = useRef<HTMLDivElement>();
  const currentTranslation = useRef<HTMLSpanElement>();

  const hasTranslation = useMemo(
    () => _.reduce(lyrics.lines, (res, val) => res || Boolean(val?.attachments?.translation), false),
    [lyrics.lines]
  );

  const {playerState, currentFrameId, startTimes, endTimes} = usePlainPlayerLyricsState(lyrics, playerRef);


  const timeline = useMemo(() => {
    const tl = gsap.timeline({
      paused: true,
    });
    console.log("wrapper-current", wrapper.current);
    if (wrapper.current && container.current) {
      const lines = wrapper.current.children;
      tl.set(wrapper.current, {x: 0}, 0);
      for (let i = 0; i < lines.length; i++) {
        const el = lines[i] as HTMLDivElement;
        tl.to(wrapper.current, {
          x: -(el.offsetLeft - (container.current.offsetWidth / 2) + el.offsetWidth),
          duration: endTimes[i + 1] - startTimes[i],
          ease: "none",
        }, startTimes[i]);
      }
    }
    if (translationWrapper.current && translationContainer.current) {
      const lines = translationWrapper.current.children;
      tl.set(translationWrapper.current, {x: 0}, 0);
      for (let i = 0; i < lines.length; i++) {
        const el = lines[i] as HTMLDivElement;
        tl.to(translationWrapper.current, {
          x: -(el.offsetLeft - (translationContainer.current.offsetWidth / 2) + el.offsetWidth),
          duration: endTimes[i + 1] - startTimes[i],
          ease: "none",
        }, startTimes[i]);
      }
    }
    return tl;

    // Adding wrapper.current, translationWrapper.current for the timeline to change along with the lyrics.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wrapper.current, translationWrapper.current, startTimes, endTimes]);

  // Controls the progress of timeline
  useEffect(() => {
    const now = performance.now();

    if (playerState.state === "playing") {
      const progress = (now - playerState.startingAt) / 1000;
      timeline.seek(progress);
      timeline.play();
    } else {
      timeline.pause();
      timeline.seek(playerState.progress);
    }
  }, [playerState, timeline]);

  // Stop a timeline when its lifespan ends.
  useEffect(() => {
    return () => {
      timeline.pause();
    };
  }, [timeline]);

  return <div className={styles.container}>
    <div className={clsx(styles.lines, styles.lyrics)} lang="ja" ref={container}>
      <div ref={wrapper} className={styles.wrapper}>
        {lyrics.lines.map((v, idx) => {
          return (
            <span key={idx} className={clsx(styles.line, idx === currentFrameId && "active")} ref={idx === currentFrameId ? currentLine : null}>
              {v.content}
            </span>
          );
        })}
      </div>
    </div>
    {hasTranslation &&
      <div className={clsx(styles.lines, styles.translations)} lang="zh" ref={translationContainer}>
        <div ref={translationWrapper} className={styles.wrapper}>
          {lyrics.lines.map((v, idx) => {
            return (
              <span key={idx} className={clsx(styles.line, idx === currentFrameId && "active")} ref={idx === currentFrameId ? currentTranslation : null}>
                {v.attachments.translation}
              </span>
            );
          })}
        </div>
      </div>
    }
  </div>;
}