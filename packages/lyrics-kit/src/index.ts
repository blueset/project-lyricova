export { LyricsProviderManager } from "./service/lyricsProviderManager.js";
export { LyricsProviderSource } from "./service/lyricsProviderSource.js";
export { LyricsSearchRequest } from "./service/lyricsSearchRequest.js";
export { Lyrics, type LyricsJSON } from "./core/lyrics.js";
export { LyricsLine, type LyricsLineJSON } from "./core/lyricsLine.js";
export {
  Attachments,
  isTranslationTag,
  PlainText,
  WordTimeTagLabel,
  WordTimeTag,
  RangeAttributeLabel,
  RangeAttribute,
  type AttachmentsContent,
} from "./core/lyricsLineAttachment.js";
export {
  LyricsMetadata,
  ATTACHMENT_TAGS,
  SOURCE,
  REQUEST,
  SEARCH_INDEX,
  REMOTE_URL,
  ARTWORK_URL,
  PROVIDER_TOKEN,
} from "./core/lyricsMetadata.js";
export {
  TITLE,
  ALBUM,
  ARTIST,
  AUTHOR,
  LRC_BY,
  OFFSET,
  LENGTH,
} from "./core/idTagKey.js";
