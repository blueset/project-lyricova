import { LyricsKitLyrics } from "../../../graphql/LyricsKitObjects";
import { useAppContext } from "../AppContext";
import { useLyricsState } from "../../../frontendUtils/hooks";
import { makeStyles } from "@material-ui/core";
import { useCallback, useMemo, useRef } from "react";
import clsx from "clsx";
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

  const lineDurations = useMemo(() => lyrics.lines.map((v, idx, arr) => {
    if (idx + 1 < arr.length) {
      return [v.position, arr[idx + 1].position];
    } else if (lyrics.length) {
      return [v.position, lyrics.length];
    } else if (playerRef.current) {
      return [v.position, playerRef.current.duration];
    } else {
      return [v.position, v.position + 1];
    }
  }), [lyrics.lines]);

  const hasTranslation = useMemo(
    () => _.reduce(lyrics.lines, (res, val) => res || Boolean(val?.attachments?.translation), false),
    [lyrics.lines]
  );

  const frameCallback = useCallback((thisLine: number, lyrics: LyricsKitLyrics, player: HTMLAudioElement) => {
    if (!currentLine.current || !container.current || thisLine === null) return;
    const [start, end] = lineDurations[thisLine];
    const time = player.currentTime;
    const percentage = (start <= time && time <= end) ? (time - start) / (end - start) : 0;

    const offset =
      currentLine.current.offsetLeft -
      (container.current.offsetWidth / 2) +
      percentage * currentLine.current.offsetWidth;
    wrapper.current.style.transform = `translateX(-${offset}px)`;


    if (hasTranslation && translationContainer.current && currentTranslation.current && translationWrapper.current) {
      const offset =
        currentTranslation.current.offsetLeft -
        (translationContainer.current.offsetWidth / 2) +
        percentage * currentTranslation.current.offsetWidth;
      translationWrapper.current.style.transform = `translateX(-${offset}px)`;

    }
  }, [lyrics]);

  const line = useLyricsState(playerRef, lyrics, frameCallback);

  return <div className={styles.container}>
    <div className={clsx(styles.lines, styles.lyrics)} lang="ja" ref={container}>
      <div ref={wrapper} className={styles.wrapper}>
        {lyrics.lines.map((v, idx) => {
          return (
            <span key={idx} className={clsx(styles.line, idx === line && "active")} ref={idx === line ? currentLine : null}>
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
              <span key={idx} className={clsx(styles.line, idx === line && "active")} ref={idx === line ? currentTranslation : null}>
                {v.attachments.translation}
              </span>
            );
          })}
        </div>
      </div>
    }
  </div>;
}