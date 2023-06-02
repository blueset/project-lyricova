import { describe, expect, it } from "@jest/globals";
import {
  Track,
  loadTracks,
  removeTrack,
  toggleShuffle,
  visualPlaylistSelector,
} from "./playlist";
import store from "./store";

const tracks: Track[] = [
  { id: 0, fileSize: 0, hasCover: false, duration: 0, hasLyrics: false },
  { id: 1, fileSize: 1, hasCover: false, duration: 1, hasLyrics: false },
  { id: 2, fileSize: 2, hasCover: false, duration: 2, hasLyrics: false },
  { id: 3, fileSize: 3, hasCover: false, duration: 3, hasLyrics: false },
  { id: 4, fileSize: 4, hasCover: false, duration: 4, hasLyrics: false },
  { id: 5, fileSize: 5, hasCover: false, duration: 5, hasLyrics: false },
  { id: 6, fileSize: 6, hasCover: false, duration: 6, hasLyrics: false },
];

describe("Playlist reducer slice", () => {
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
