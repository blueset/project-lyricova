import { describe, expect, it } from "vitest";
import {
  MAX_UPLOAD_FILE_SIZE,
  uploadFileKey,
  validateUploadFile,
} from "./uploadQueue";

describe("upload queue validation", () => {
  it.each(["track.mp3", "track.MP3", "track.flac", "track.AIFF"])(
    "accepts %s",
    (name) => {
      expect(validateUploadFile({ name, size: 1 })).toBeNull();
    },
  );

  it("rejects unsupported, empty, and oversized files", () => {
    expect(validateUploadFile({ name: "track.wav", size: 1 })).toMatch(
      /Only MP3/,
    );
    expect(validateUploadFile({ name: "track.mp3", size: 0 })).toMatch(/empty/);
    expect(
      validateUploadFile({
        name: "track.mp3",
        size: MAX_UPLOAD_FILE_SIZE + 1,
      }),
    ).toMatch(/500 MiB/);
  });

  it("uses file identity fields for queue deduplication", () => {
    expect(
      uploadFileKey({ name: "track.mp3", size: 10, lastModified: 20 }),
    ).toBe("track.mp3\u000010\u000020");
  });
});
