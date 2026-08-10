export const LYRICS_DRAFT_VERSION = 1;
export const LYRICS_DRAFT_AUTOSAVE_DELAY = 1000;

const LYRICS_DRAFT_KEY_PREFIX = "lyricova.jukebox.lyricsDraft";

export interface LyricsDraftContent {
  lrc: string;
  lrcx: string;
}

export interface LyricsDraftRecord extends LyricsDraftContent {
  version: typeof LYRICS_DRAFT_VERSION;
  fileId: number;
  baseLrc: string;
  baseLrcx: string;
  updatedAt: string;
}

export function lyricsDraftKey(fileId: number): string {
  return `${LYRICS_DRAFT_KEY_PREFIX}.v${LYRICS_DRAFT_VERSION}.${fileId}`;
}

function isStringRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isLyricsDraftRecord(
  value: unknown,
  fileId: number,
): value is LyricsDraftRecord {
  if (!isStringRecord(value)) return false;

  return (
    value.version === LYRICS_DRAFT_VERSION &&
    value.fileId === fileId &&
    typeof value.baseLrc === "string" &&
    typeof value.baseLrcx === "string" &&
    typeof value.lrc === "string" &&
    typeof value.lrcx === "string" &&
    typeof value.updatedAt === "string" &&
    !Number.isNaN(Date.parse(value.updatedAt))
  );
}

export function isLyricsContentEqual(
  left: LyricsDraftContent,
  right: LyricsDraftContent,
): boolean {
  return left.lrc === right.lrc && left.lrcx === right.lrcx;
}

export function isLyricsDraftStale(
  draft: LyricsDraftRecord,
  currentBase: LyricsDraftContent,
): boolean {
  return (
    draft.baseLrc !== currentBase.lrc || draft.baseLrcx !== currentBase.lrcx
  );
}

export function loadLyricsDraft(
  storage: Storage,
  fileId: number,
): LyricsDraftRecord | null {
  const key = lyricsDraftKey(fileId);
  const serialized = storage.getItem(key);
  if (serialized === null) return null;

  try {
    const value: unknown = JSON.parse(serialized);
    if (isLyricsDraftRecord(value, fileId)) return value;
  } catch {
    // Invalid records are removed below.
  }

  storage.removeItem(key);
  return null;
}

export function persistLyricsDraft(
  storage: Storage,
  fileId: number,
  content: LyricsDraftContent,
  base: LyricsDraftContent,
  updatedAt = new Date(),
): LyricsDraftRecord | null {
  const key = lyricsDraftKey(fileId);
  if (isLyricsContentEqual(content, base)) {
    storage.removeItem(key);
    return null;
  }

  const draft: LyricsDraftRecord = {
    version: LYRICS_DRAFT_VERSION,
    fileId,
    baseLrc: base.lrc,
    baseLrcx: base.lrcx,
    lrc: content.lrc,
    lrcx: content.lrcx,
    updatedAt: updatedAt.toISOString(),
  };
  storage.setItem(key, JSON.stringify(draft));
  return draft;
}

export function removeLyricsDraft(storage: Storage, fileId: number): void {
  storage.removeItem(lyricsDraftKey(fileId));
}
