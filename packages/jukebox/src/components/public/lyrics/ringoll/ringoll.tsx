import { useRef } from "react";
import { usePlayerState } from "../../../../frontendUtils/hooks";
import { LyricsKitLyrics } from "../../../../graphql/LyricsKitObjects";
import { useAppContext } from "../../AppContext";
import { LyricsVirtualizer } from "./LyricsVirtualizer";
import { RowRenderer } from "./RowRenderer";

interface Props {
  lyrics: LyricsKitLyrics;
}

/** Lyricova’s own implementation of scrollable lyrics based on the architecture of AMLL. */
export function RingollLyrics({ lyrics }: Props) {
  const { playerRef } = useAppContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const playerState = usePlayerState(playerRef);
  return (
    <LyricsVirtualizer rows={lyrics.lines} estimatedRowHeight={20}>
      {(props) => <RowRenderer key={props.row.position} {...props} />}
    </LyricsVirtualizer>
  );
}
