import { describe, expect, it } from "vitest";
import {
  buildMp3NormalizationArgs,
  packetsMatchTargetBitrate,
} from "./mp3Normalization.js";

describe("MP3 normalization", () => {
  it("recognizes constant 128 kbps frames including padding", () => {
    expect(
      packetsMatchTargetBitrate(
        [
          { size: "417", duration_time: "0.026122" },
          { size: "418", duration_time: "0.026122" },
        ],
        128,
      ),
    ).toBe(true);
  });

  it("rejects variable, missing, and non-target packet rates", () => {
    expect(
      packetsMatchTargetBitrate(
        [
          { size: "417", duration_time: "0.026122" },
          { size: "313", duration_time: "0.026122" },
        ],
        128,
      ),
    ).toBe(false);
    expect(packetsMatchTargetBitrate([], 128)).toBe(false);
  });

  it("builds an ffmpeg command that preserves metadata and artwork", () => {
    const args = buildMp3NormalizationArgs("source.mp3", "output.mp3", 128);
    expect(args).toContain("libmp3lame");
    expect(args).toContain("128k");
    expect(args).toContain("0:v?");
    expect(args).toContain("-map_metadata");
    expect(args.at(-1)).toBe("output.mp3");
  });
});
