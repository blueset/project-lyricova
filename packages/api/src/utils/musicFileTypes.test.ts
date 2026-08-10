import path from "path";
import {
  hasAudioStream,
  isDetectedMusicFormatSupported,
  isSupportedMusicFileName,
  resolveMusicUploadDestination,
} from "./musicFileTypes.js";

describe("music file type rules", () => {
  it.each(["track.mp3", "track.MP3", "track.flac", "track.AiFf"])(
    "accepts Scan-supported file %s",
    (fileName) => {
      expect(isSupportedMusicFileName(fileName)).toBe(true);
    },
  );

  it.each(["track.aif", "track.wav", "track.mp3.exe", "track"])(
    "rejects unsupported file %s",
    (fileName) => {
      expect(isSupportedMusicFileName(fileName)).toBe(false);
    },
  );

  it("strips client path components and stays inside the music root", () => {
    const root = path.resolve("/music");
    expect(
      resolveMusicUploadDestination("../../album/track.mp3", root),
    ).toEqual({
      fileName: "track.mp3",
      fullPath: path.join(root, "track.mp3"),
    });
    expect(
      resolveMusicUploadDestination("C:\\album\\track.flac", root),
    ).toEqual({
      fileName: "track.flac",
      fullPath: path.join(root, "track.flac"),
    });
  });

  it("rejects invalid and unsupported basenames", () => {
    expect(() => resolveMusicUploadDestination("\u0000.mp3", "/music")).toThrow(
      "Invalid upload filename.",
    );
    expect(() =>
      resolveMusicUploadDestination("track.wav", "/music"),
    ).toThrow("Only MP3, FLAC, and AIFF files are supported.");
  });

  it("requires an actual audio stream", () => {
    expect(hasAudioStream([{ codec_type: "video" }])).toBe(false);
    expect(
      hasAudioStream([{ codec_type: "video" }, { codec_type: "audio" }]),
    ).toBe(true);
  });

  it("matches the detected container to the allowed extension", () => {
    expect(isDetectedMusicFormatSupported("track.mp3", "mp3")).toBe(true);
    expect(isDetectedMusicFormatSupported("track.flac", "flac")).toBe(true);
    expect(isDetectedMusicFormatSupported("track.aiff", "aiff")).toBe(true);
    expect(isDetectedMusicFormatSupported("renamed.mp3", "mov,mp4,m4a")).toBe(
      false,
    );
    expect(isDetectedMusicFormatSupported("renamed.flac", "wav")).toBe(false);
  });
});
