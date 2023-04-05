import type { PayloadAction } from "@reduxjs/toolkit";
import { createSlice } from "@reduxjs/toolkit";
import _ from "lodash";
import type { MusicFile } from "lyricova-common/models/MusicFile";
import type { RootState } from "./store";
import { persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";

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

export interface PlaylistState {
  tracks: Track[];

  /** Track index number AFTER shuffle mapping. */
  nowPlaying: number | null;
  
  /** Should play immediately when `nowPlaying` is changed. */
  playNow: boolean | null;

  loopMode: "single" | "all" | "none";
  shuffleMapping: number[] | null;

  isCollapsed: boolean;
}

const initialState: PlaylistState = {
  tracks: [],
  nowPlaying: null,
  loopMode: "all",
  shuffleMapping: null,
  isCollapsed: false,
  playNow: null,
};

export const playlistSlice = createSlice({
  name: "playlist",
  initialState,
  reducers: {
    loadTracks: (state, action: PayloadAction<Track[]>) => {
      state.tracks = action.payload;
      state.shuffleMapping = null;
    },
    playTrack: (state, action: PayloadAction<number | {track: number, playNow: boolean}>) => {
      if (typeof action.payload === "number") {
        state.nowPlaying = action.payload;
      } else {
        state.nowPlaying = action.payload.track;
        state.playNow = action.payload.playNow;
      }
    },
    playPrevious: (state) => {
      if (state.tracks.length < 1) return;
      if (state.nowPlaying === null) {
        state.nowPlaying = state.tracks.length - 1;
      } else if (state.nowPlaying > 0) {
        state.nowPlaying--;
      } else if (state.loopMode === "all") {
        state.nowPlaying = state.tracks.length - 1;
      } else {
        state.nowPlaying = null;
      }
    },
    playNext: (state) => {
      if (state.tracks.length < 1) return;
      if (state.nowPlaying === null) {
        state.nowPlaying = 0;
      } else if (state.nowPlaying < state.tracks.length - 1) {
        state.nowPlaying++;
      } else if (state.loopMode === "all") {
        state.nowPlaying = 0;
      } else {
        state.nowPlaying = null;
      }
    },
    addTrackToNext: (state, action: PayloadAction<Track>) => {
      const index = state.nowPlaying ?? 0;
      state.tracks.splice(index + 1, 0, action.payload);
    },
    removeTrack: (state, action: PayloadAction<number>) => {
      let index = action.payload;
      if (state.shuffleMapping !== null) {
        const realIndex = state.shuffleMapping[index];
        state.shuffleMapping.splice(index, 1);
        index = realIndex;
      }
      state.tracks.splice(action.payload, 1);
      if (
        state.nowPlaying !== null &&
        state.nowPlaying >= state.tracks.length
      ) {
        state.nowPlaying = state.tracks.length - 1;
      }
    },
    moveTrack: (state, action: PayloadAction<{ from: number; to: number }>) => {
      const { from, to } = action.payload;
      if (state.shuffleMapping) {
        const map = state.shuffleMapping[from];
        state.shuffleMapping.splice(from, 1);
        state.shuffleMapping.splice(to, 0, map);
      } else {
        const track = state.tracks[from];
        state.tracks.splice(from, 1);
        state.tracks.splice(to, 0, track);
      }
      if (state.nowPlaying !== null) {
        if (state.nowPlaying === from) {
          state.nowPlaying = to;
        } else if (from < state.nowPlaying && state.nowPlaying <= to) {
          state.nowPlaying--;
        } else if (to <= state.nowPlaying && state.nowPlaying < from) {
          state.nowPlaying++;
        }
      }
    },
    toggleShuffle: (state) => {
      if (state.tracks.length < 2) {
        state.shuffleMapping = null;
        return;
      }
      if (state.shuffleMapping) {
        if (state.nowPlaying !== null) {
          state.nowPlaying = state.shuffleMapping[state.nowPlaying];
        }
        state.shuffleMapping = null;
      } else {
        const mapping = _.shuffle(_.range(state.tracks.length));
        console.log("nowPlaying", state.nowPlaying);
        if (state.nowPlaying !== null) {
          const np = state.nowPlaying;
          const repIndex = mapping.indexOf(state.nowPlaying);
          [mapping[np], mapping[repIndex]] = [mapping[repIndex], mapping[np]];
        }
        state.shuffleMapping = mapping;
      }
    },
    setLoopMode: (state, action: PayloadAction<"single" | "all" | "none">) => {
      state.loopMode = action.payload;
    },
    stop: (state) => {
      state.nowPlaying = null;
    },
    setCollapsed: (state, action: PayloadAction<boolean>) => {
      state.isCollapsed = action.payload;
    }
  },
});

export const { 
  loadTracks,
  playTrack,
  playPrevious,
  playNext,
  addTrackToNext,
  removeTrack,
  moveTrack,
  toggleShuffle,
  setLoopMode,
  stop,
  setCollapsed,
} = playlistSlice.actions;


const persistConfig = {
  key: "lyricovaJukeboxPublicReduxPlaylist",
  storage,
  blacklist: ["playNow"],
};

const persistedReducer = persistReducer(persistConfig, playlistSlice.reducer);

export default persistedReducer;

export const currentSongSelector = (state: RootState) => {
  const { tracks, nowPlaying, shuffleMapping } = state.playlist;
  if (nowPlaying === null) return null;
  if (shuffleMapping !== null) return tracks[shuffleMapping[nowPlaying]];
  return tracks[nowPlaying];
};

export const visualPlaylistSelector = (state: RootState) => {
  const { tracks, shuffleMapping } = state.playlist;
  if (shuffleMapping !== null) {
    return shuffleMapping.map((index) => tracks[index]);
  }
  return tracks;
};
