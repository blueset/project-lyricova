export { Lyrics, type LyricsJSON } from "./lyrics.js";
export { LyricsLine, type LyricsLineJSON } from "./lyricsLine.js";
export * from "./attachmentTypes.js";
export {
  type Range,
  TRANSLATION,
  TIME_TAG,
  FURIGANA,
  ROMAJI,
  METADATA_ROLE,
  METADATA_MINOR,
  DOTS,
  TAGS,
  Attachments,
  isTranslationTag,
  PlainText,
  WordTimeTagLabel,
  WordTimeTag,
  RangeAttributeLabel,
  RangeAttribute,
  type AttachmentsContent,
} from "./lyricsLineAttachment.js";
export {
  LyricsMetadata,
  ATTACHMENT_TAGS,
  SOURCE,
  REQUEST,
  SEARCH_INDEX,
  REMOTE_URL,
  ARTWORK_URL,
  PROVIDER_TOKEN,
} from "./lyricsMetadata.js";
export {
  TITLE,
  ALBUM,
  ARTIST,
  AUTHOR,
  LRC_BY,
  OFFSET,
  LENGTH,
} from "./idTagKey.js";
export { buildTimeTag, resolveTimeTag } from "../utils/regexPattern.js";
