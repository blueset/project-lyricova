import { LyricsKitLyrics } from "@lyricova/api/graphql/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  LyricLine as AAMLyricLine,
  LyricWord as AMLLyricWord,
} from "@applemusic-like-lyrics/core";
import { useAppContext } from "../AppContext";
import { usePlayerState } from "../../../hooks/usePlayerState";
import dynamic from "next/dynamic";

const LyricPlayer = dynamic(
  () => import("../compat/amllLyricsPlayer").then((m) => m.LyricPlayer),
  {
    ssr: false,
  }
);

interface Props {
  lyrics: LyricsKitLyrics;
  transLangIdx?: number;
}

export function AMLLyrics({ lyrics, transLangIdx }: Props) {
  const { playerRef } = useAppContext();
  const playerState = usePlayerState(playerRef);
  const lang = lyrics.translationLanguages[transLangIdx ?? 0];

  const containerRef = useRef<HTMLDivElement>(null);

  const amlLyricsArray: AAMLyricLine[] = useMemo(() => {
    const amlLyricsArray = lyrics.lines.map((line, index, array) => {
      const amllWords: AMLLyricWord[] = [];
      const startTime = line.position;
      let endTime =
        array?.[index + 1]?.position ?? playerRef?.current.duration ?? Infinity;
      if (line.attachments.timeTag?.tags?.length) {
        endTime = Math.max(
          endTime,
          startTime +
            line.attachments.timeTag.tags[
              line.attachments.timeTag.tags.length - 1
            ].timeTag
        );
        const tags = [...line.attachments.timeTag.tags];
        if (tags[0].index !== 0) tags.unshift({ timeTag: 0, index: 0 });
        if (tags[tags.length - 1].index !== line.content.length)
          tags.push({ timeTag: endTime, index: line.content.length });
        tags.forEach(({ timeTag, index }, tagIdx) => {
          if (tagIdx === 0) return;
          const lastIndex = tags[tagIdx - 1].index;
          // AAML want inter-word space to be its own tag
          let spacer = "";
          while (index > 0 && line.content[index - 1] === " ") {
            spacer += " ";
            index--;
          }
          const word = line.content.slice(lastIndex, index);
          amllWords.push({
            startTime: (startTime + tags[tagIdx - 1].timeTag) * 1000,
            endTime: (startTime + timeTag) * 1000,
            word,
          });
          if (spacer) {
            amllWords.push({
              startTime: (startTime + timeTag) * 1000,
              endTime: (startTime + timeTag) * 1000,
              word: spacer,
            });
          }
        });
      } else {
        amllWords.push({
          startTime: startTime * 1000,
          endTime: endTime * 1000,
          word: line.content,
        });
      }
      const amllLine: AAMLyricLine = {
        words: amllWords,
        translatedLyric: line.attachments.translations[lang] ?? "",
        romanLyric: "",
        startTime: startTime * 1000,
        endTime: endTime * 1000,
        isBG: line.attachments.minor,
        isDuet: line.attachments.role > 0,
      };
      return amllLine;
    });
    return amlLyricsArray;
  }, [lang, lyrics.lines, playerRef]);

  const [playbackProgressMs, setPlaybackProgressMs] = useState(
    Math.floor(playerRef.current.currentTime * 1000)
  );
  const updatePlaybackProgressMs = useCallback(() => {
    setPlaybackProgressMs(Math.floor(playerRef.current.currentTime * 1000));
    if (playerRef.current?.paused !== true) {
      requestAnimationFrame(updatePlaybackProgressMs);
    }
  }, [playerRef]);

  useEffect(() => {
    requestAnimationFrame(updatePlaybackProgressMs);
  }, [playerState.state, updatePlaybackProgressMs]);

  useEffect(() => {
    function onTimeUpdate() {
      requestAnimationFrame(updatePlaybackProgressMs);
    }
    const player = playerRef.current;
    player.addEventListener("timeupdate", onTimeUpdate);
    player.addEventListener("seeked", onTimeUpdate);
    return () => {
      player.removeEventListener("timeupdate", onTimeUpdate);
      player.removeEventListener("seeked", onTimeUpdate);
    };
  }, [playerRef, updatePlaybackProgressMs]);

  return (
    <div
      lang="ja"
      ref={containerRef}
      className="w-full h-full overflow-hidden relative [--amll-lyric-player-font-size:3em] [&_>_div]:size-full [&_>_div]:overflow-hidden [&_>_div]:relative [&_>_div_div[class*='lyricMainLine-']]:font-semibold [&_>_div_div[class*='lyricMainLine-']]:text-balance"
    >
      <LyricPlayer
        lyricLines={amlLyricsArray}
        currentTime={playbackProgressMs}
        playing={playerState.state === "playing"}
        alignAnchor="top"
        alignPosition={0.1}
        onLyricLineClick={(evt) => {
          playerRef.current.currentTime = evt.line.getLine().startTime / 1000;
        }}
      />
    </div>
  );
}
