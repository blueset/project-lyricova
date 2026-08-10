export const MAX_UPLOAD_FILE_SIZE = 500 * 1024 * 1024;
export const MAX_UPLOAD_BATCH_FILES = 50;
export const SUPPORTED_UPLOAD_EXTENSIONS = [".mp3", ".flac", ".aiff"] as const;

export function uploadFileKey(
  file: Pick<File, "name" | "size" | "lastModified">,
): string {
  return `${file.name}\u0000${file.size}\u0000${file.lastModified}`;
}

export function validateUploadFile(
  file: Pick<File, "name" | "size">,
): string | null {
  const lowerName = file.name.toLowerCase();
  if (
    !SUPPORTED_UPLOAD_EXTENSIONS.some((extension) =>
      lowerName.endsWith(extension),
    )
  ) {
    return "Only MP3, FLAC, and AIFF files are supported.";
  }
  if (file.size === 0) {
    return "The file is empty.";
  }
  if (file.size > MAX_UPLOAD_FILE_SIZE) {
    return "File exceeds the 500 MiB limit.";
  }
  return null;
}
