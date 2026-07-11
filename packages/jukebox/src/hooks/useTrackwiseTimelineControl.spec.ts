import { describe, expect, it, vi } from "vitest";
import { synchronizeGsapTimeline } from "./useTrackwiseTimelineControl";

function timelineStub() {
  return {
    pause: vi.fn(),
    play: vi.fn(),
    timeScale: vi.fn(),
  } as unknown as gsap.core.Timeline;
}

describe("synchronizeGsapTimeline", () => {
  it("seeks and plays at the media playback rate", () => {
    const timeline = timelineStub();

    synchronizeGsapTimeline(timeline, {
      currentTime: 12,
      duration: 20,
      playbackRate: 1.5,
      state: "playing",
    });

    expect(timeline.timeScale).toHaveBeenCalledWith(1.5);
    expect(timeline.play).toHaveBeenCalledWith(12, false);
  });

  it("applies offsets and pauses", () => {
    const timeline = timelineStub();

    synchronizeGsapTimeline(
      timeline,
      {
        currentTime: 12,
        duration: 20,
        playbackRate: 0.75,
        state: "paused",
      },
      10,
    );

    expect(timeline.timeScale).toHaveBeenCalledWith(0.75);
    expect(timeline.pause).toHaveBeenCalledWith(2, false);
  });
});
