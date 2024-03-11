import { usePlayerState } from "../../../../frontendUtils/hooks";
import { LyricsKitLyrics } from "../../../../graphql/LyricsKitObjects";
import { useAppContext } from "../../AppContext";

interface Props {
  lyrics: LyricsKitLyrics;
}

/** Lyricova’s own implementation of scrollable lyrics based on the architecture of AMLL. */
export function RingollLyrics({ lyrics }: Props) {
  const { playerRef } = useAppContext();
  const playerState = usePlayerState(playerRef);
  return <div>RingollLyrics</div>;
}