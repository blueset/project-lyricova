import { describe, expect, it } from "vitest";
import { virtualRowIndexToTrackIndex } from "./virtualRowIndex";

describe("virtualRowIndexToTrackIndex", () => {
  it("should exclude the controls row from track indexes", () => {
    expect(virtualRowIndexToTrackIndex(0)).toBeNull();
    expect(virtualRowIndexToTrackIndex(1)).toBe(0);
    expect(virtualRowIndexToTrackIndex(5)).toBe(4);
  });
});
