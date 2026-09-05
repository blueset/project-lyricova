import { describe, expect, it } from "vitest";
import {
  outputContextTimeAtPerformanceTime,
  playbackProgressAtContextTime,
  type WebAudioPlaybackSegment,
} from "./webAudioPresentationClock";

describe("outputContextTimeAtPerformanceTime", () => {
  it("maps a performance-clock instant onto the output context clock", () => {
    expect(
      outputContextTimeAtPerformanceTime(
        { contextTime: 12, performanceTime: 4_000 },
        4_250,
      ),
    ).toBe(12.25);
  });

  it("rejects invalid timestamps", () => {
    expect(
      outputContextTimeAtPerformanceTime(
        { contextTime: Number.NaN, performanceTime: 0 },
        0,
      ),
    ).toBeNull();
  });
});

describe("playbackProgressAtContextTime", () => {
  const segments: WebAudioPlaybackSegment[] = [
    { contextTime: 10, progress: 2, rate: 1, endContextTime: 14 },
    { contextTime: 14, progress: 20, rate: 0.5, endContextTime: 18 },
    { contextTime: 20, progress: 22, rate: 2 },
  ];

  it("uses the segment and rate active at the requested context time", () => {
    expect(playbackProgressAtContextTime(segments, 12)).toBe(4);
    expect(playbackProgressAtContextTime(segments, 16)).toBe(21);
    expect(playbackProgressAtContextTime(segments, 21.5)).toBe(25);
  });

  it("preserves progress during gaps and before playback starts", () => {
    expect(playbackProgressAtContextTime(segments, 5)).toBe(2);
    expect(playbackProgressAtContextTime(segments, 19)).toBe(22);
  });

  it("selects the new segment at a seek boundary", () => {
    expect(playbackProgressAtContextTime(segments, 14)).toBe(20);
  });
});
