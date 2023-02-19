import React, { RefObject, ReactChild, useContext } from "react";
import { MusicFile } from "lyricova-common/models/MusicFile";

export type Track = Pick<
  MusicFile,
  | "id"
  | "fileSize"
  | "trackName"
  | "trackSortOrder"
  | "artistName"
  | "artistSortOrder"
  | "albumName"
  | "albumSortOrder"
  | "hasCover"
  | "duration"
  | "hasLyrics"
>;

export enum LoopMode {
  SINGLE = "SINGLE",
  ALL = "ALL",
  NONE = "NONE",
}

export interface Playlist {
  tracks: Track[];

  /** Track index number AFTER shuffle mapping. */
  nowPlaying?: number;

  loopMode: LoopMode;
  shuffleMapping?: number[];

  loadTracks: (tracks: Track[]) => void;
  playTrack: (index: number, playNow?: boolean) => void;
  playNext: (playNow?: boolean) => void;
  playPrevious: (playNow?: boolean) => void;
  addTrackToNext: (track: Track) => void;
  removeTrack: (index: number) => void;
  moveTrack: (from: number, to: number) => void;
  toggleShuffle: () => void;
  stop: () => void;

  setLoopMode: (loopMode: LoopMode) => void;
  getCurrentSong: () => Track | null;
  getCurrentCoverUrl: () => string | null;
  getSongByIndex: (index: number) => Track | null;
}

const PlayerRefContext = React.createContext<RefObject<HTMLAudioElement>>(null);
PlayerRefContext.displayName = "PlayerRefContext";

export interface ContextProps {
  playerRef: RefObject<HTMLAudioElement>;
  children?: ReactChild;
}
export function AppContext({ playerRef, children }: ContextProps) {
  return (
    <PlayerRefContext.Provider value={playerRef}>
      {children}
    </PlayerRefContext.Provider>
  );
}

export function useAppContext() {
  return {
    playerRef: useContext(PlayerRefContext) as RefObject<HTMLAudioElement>,
  };
}
