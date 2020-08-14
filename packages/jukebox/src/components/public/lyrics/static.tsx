import { LyricsKitLyrics, LyricsKitLyricsLine } from "../../../graphql/LyricsKitObjects";
import { useAppContext } from "../AppContext";
import { useLyricsState } from "../../../frontendUtils/hooks";

interface Props {
  lyrics: LyricsKitLyrics;
}

export function StaticLyrics({ lyrics }: Props) {
  const { playerRef } = useAppContext();
  const line = useLyricsState(playerRef, lyrics);

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


  return <div>{node}</div>;
}