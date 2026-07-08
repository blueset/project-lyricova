import type { ReactNode, RefObject } from "react";
import React, { useContext } from "react";
import type { MusicFile } from "@lyricova/components/gql/schema";

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

const PlayerRefContext =
  React.createContext<RefObject<HTMLAudioElement> | null>(null);
PlayerRefContext.displayName = "PlayerRefContext";

export interface ContextProps {
  playerRef: RefObject<HTMLAudioElement>;
  children?: ReactNode;
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
