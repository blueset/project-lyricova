import { describe, expect, it } from "vitest";
import type { Track } from "./playlist";
import {
  addTrackToNext,
  loadTracks,
  removeTrack,
  stop,
  toggleShuffle,
  visualPlaylistSelector,
} from "./playlist";
import store from "./store";

const tracks = [
  { id: 0, fileSize: 0, hasCover: false, duration: 0, hasLyrics: false },
  { id: 1, fileSize: 1, hasCover: false, duration: 1, hasLyrics: false },
  { id: 2, fileSize: 2, hasCover: false, duration: 2, hasLyrics: false },
  { id: 3, fileSize: 3, hasCover: false, duration: 3, hasLyrics: false },
  { id: 4, fileSize: 4, hasCover: false, duration: 4, hasLyrics: false },
  { id: 5, fileSize: 5, hasCover: false, duration: 5, hasLyrics: false },
  { id: 6, fileSize: 6, hasCover: false, duration: 6, hasLyrics: false },
] as unknown as Track[];

describe("Playlist reducer slice", () => {
  it("should add the next track first when no track is playing", () => {
    store.dispatch(loadTracks(tracks.slice(0, 2)));
    store.dispatch(stop());
    store.dispatch(addTrackToNext(tracks[2]));

    expect(visualPlaylistSelector(store.getState())).toEqual([
      tracks[2],
      tracks[0],
      tracks[1],
    ]);
  });

  it("should delete items properly when shuffled", () => {
    store.dispatch(loadTracks(tracks));
    if (!store.getState().playlist.shuffleMapping)
      store.dispatch(toggleShuffle());
    const outcome = visualPlaylistSelector(store.getState());
    expect(outcome).toHaveLength(7);

    // Remove item #3
    outcome.splice(3, 1);
    store.dispatch(removeTrack(3));

    const outcome2 = visualPlaylistSelector(store.getState());
    expect(outcome2).toHaveLength(6);
    expect(outcome2).toEqual(outcome);
  });
});
