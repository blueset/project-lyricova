import path from "path";

export const SUPPORTED_MUSIC_FILE_EXTENSIONS = [
  ".mp3",
  ".flac",
  ".aiff",
] as const;

export const SUPPORTED_MUSIC_FILE_GLOB =
  "{[mM][pP]3,[fF][lL][aA][cC],[aA][iI][fF][fF]}";

export function isSupportedMusicFileName(fileName: string): boolean {
  const extension = path.extname(fileName).toLowerCase();
  return SUPPORTED_MUSIC_FILE_EXTENSIONS.some(
    (supported) => supported === extension,
  );
}

export function hasAudioStream(
  streams: ReadonlyArray<{ codec_type?: string }>,
): boolean {
  return streams.some((stream) => stream.codec_type === "audio");
}

export function isDetectedMusicFormatSupported(
  fileName: string,
  detectedFormats: string | undefined,
): boolean {
  const extension = path.extname(fileName).toLowerCase();
  const formats = new Set(
    (detectedFormats ?? "").split(",").map((format) => format.trim()),
  );
  return formats.has(extension.slice(1));
}

export function resolveMusicUploadDestination(
  originalName: string,
  musicFilesPath: string,
): { fileName: string; fullPath: string } {
  const normalizedName = originalName.replaceAll("\\", "/");
  const fileName = path.posix.basename(normalizedName);
  if (
    fileName.length === 0 ||
    fileName === "." ||
    fileName === ".." ||
    /[\u0000-\u001f\u007f]/u.test(fileName) ||
    Buffer.byteLength(fileName, "utf8") > 255
  ) {
    throw new Error("Invalid upload filename.");
  }
  if (!isSupportedMusicFileName(fileName)) {
    throw new Error("Only MP3, FLAC, and AIFF files are supported.");
  }

  const rootPath = path.resolve(musicFilesPath);
  const fullPath = path.resolve(rootPath, fileName);
  if (path.dirname(fullPath) !== rootPath) {
    throw new Error("Invalid upload filename.");
  }
  return { fileName, fullPath };
}
