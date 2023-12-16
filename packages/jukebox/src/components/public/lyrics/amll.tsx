import { LyricsKitLyrics } from "../../../graphql/LyricsKitObjects";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  LyricLine as AAMLyricLine,
  LyricWord as AMLLyricWord,
} from "@applemusic-like-lyrics/core";
import { useAppContext } from "../AppContext";
import { usePlayerState } from "../../../frontendUtils/hooks";
import styled from "@emotion/styled";
import dynamic from "next/dynamic";
import type { LyricPlayerRef } from "@applemusic-like-lyrics/react";

const LyricPlayer = dynamic(
  () => import("@applemusic-like-lyrics/react").then((m) => m.LyricPlayer),
  {
    ssr: false,
  }
);

const ContainerDiv = styled("div")`
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
  > div {
    width: 100%;
    height: 100%;
    overflow: hidden;
    position: relative;
  }
  > div div[class*="lyricMainLine-"] {
    font-weight: 600;
    text-wrap: balance;
  }
`;

interface Props {
  lyrics: LyricsKitLyrics;
}

export function AMLLyrics({ lyrics }: Props) {
  const { playerRef } = useAppContext();
  const playerState = usePlayerState(playerRef);

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
        translatedLyric: line.attachments.translation,
        romanLyric: "",
        startTime: startTime * 1000,
        endTime: endTime * 1000,
        isBG: false, // TODO: implement
        isDuet: !!line.content.match(/^[\(（].+[\)）]$/), // TODO: implement
      };
      return amllLine;
    });
    return amlLyricsArray;
  }, [lyrics, playerRef]);

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
    <ContainerDiv lang="ja" ref={containerRef}>
      <LyricPlayer
        lyricLines={amlLyricsArray}
        currentTime={playbackProgressMs}
        alignPosition={0.1}
        onLyricLineClick={(evt) => {
          playerRef.current.currentTime = evt.line.getLine().startTime / 1000;
        }}
      />
    </ContainerDiv>
  );
}
