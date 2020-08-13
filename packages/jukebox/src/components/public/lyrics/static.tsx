import { LyricsKitLyrics, LyricsKitLyricsLine } from "../../../graphql/LyricsKitObjects";
import { useAppContext } from "../AppContext";
import { useNamedState } from "../../../frontendUtils/hooks";
import { useEffect } from "react";
import _ from "lodash";

interface Props {
  lyrics: LyricsKitLyrics;
}

export function StaticLyrics({ lyrics }: Props) {
  const { playerRef } = useAppContext();
  const [line, setLine] = useNamedState<number | null>(null, "line");

  function onTimeUpdate() {
    const player = playerRef.current;
    if (player !== null) {
      const time = player.currentTime;
      const thisLineIndex = _.sortedIndexBy<{ position: number }>(lyrics.lines, { position: time }, "position");
      if (thisLineIndex === 0) {
        if (line !== null) setLine(null);
      } else {
        const thisLine =
          (thisLineIndex >= lyrics.lines.length || lyrics.lines[thisLineIndex].position !== time) ?
            thisLineIndex - 1 :
            thisLineIndex;
        if (thisLine != line) {
          setLine(thisLine);
        }
      }
      if (!player.paused) {
        window.requestAnimationFrame(() => onTimeUpdate(player));
      }
    } else {
      setLine(null);
    }
  }

  function onPlay() {
    window.requestAnimationFrame(onTimeUpdate);
  }

  useEffect(() => {
    const player = playerRef.current;
    if (player) {
      player.addEventListener("play", onPlay);
      if (!player.paused) {
        onPlay();
      }
      return () => {
        player.removeEventListener("play", onPlay);
      };
    }
  }, [playerRef]);

  function formatLine(line: LyricsKitLyricsLine): string {
    const translated = line?.attachments?.translation ? (` / ${line.attachments.translation}`) : "";
    return `[${line.position}] ${line.content}${translated}`;
  }

  const lines = lyrics.lines;
  let node = <span>{lines.length && formatLine(lines[0])}</span>;
  if (line !== null && lyrics !== null) {
    const before = (line <= 0) ? <div>←-</div> : <div>←{formatLine(lines[line - 1])}</div>;
    const after = (line + 1 >= lines.length) ? <div>→-</div> : <div>→{formatLine(lines[line + 1])}</div>;
    node = (<>{before}<div>{formatLine(lines[line])}</div>{after}</>);
  }


  return <div>[[[{playerRef.current?.currentTime}]]]{node}</div>;
}