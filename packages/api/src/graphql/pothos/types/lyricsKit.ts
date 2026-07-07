import { builder } from "../builder";
import type {
  LyricsKitRangeAttachment,
  LyricsKitWordTimeTag,
  LyricsKitWordTimeAttachment,
  LyricsKitAttachment,
  LyricsKitLyricsLine,
  LyricsKitLyrics,
} from "../../LyricsKitObjects";

export const LyricsKitRangeAttachmentRef =
  builder.objectRef<LyricsKitRangeAttachment>("LyricsKitRangeAttachment");

LyricsKitRangeAttachmentRef.implement({
  description: "Furigana/romaji to words in a lyrics line.",
  fields: (t) => ({
    content: t.exposeString("content", {
      description: "Furigana/romaji content",
    }),
    leftIndex: t.exposeInt("leftIndex", {
      description:
        "Starting character per Extended Grapheme Cluster (including)",
    }),
    rightIndex: t.exposeInt("rightIndex", {
      description: "Ending character per Extended Grapheme Cluster (excluding)",
    }),
  }),
});

export const LyricsKitWordTimeTagRef = builder.objectRef<LyricsKitWordTimeTag>(
  "LyricsKitWordTimeTag",
);

LyricsKitWordTimeTagRef.implement({
  description: "Time tag per word to a lyrics line.",
  fields: (t) => ({
    timeTag: t.exposeFloat("timeTag", {
      description: "Time when the time tag happens, in seconds.",
    }),
    index: t.exposeInt("index", {
      description:
        "Starting character per Extended Grapheme Cluster of this tag",
    }),
  }),
});

export const LyricsKitWordTimeAttachmentRef =
  builder.objectRef<LyricsKitWordTimeAttachment>("LyricsKitWordTimeAttachment");

LyricsKitWordTimeAttachmentRef.implement({
  description: "Time tag per word to a lyrics line.",
  fields: (t) => ({
    duration: t.exposeFloat("duration", {
      description: "Duration of line in seconds.",
      nullable: true,
    }),
    tags: t.field({
      type: [LyricsKitWordTimeTagRef],
      description: "Tags in the line.",
      nullable: true,
      resolve: (a) => a.tags,
    }),
  }),
});

export const LyricsKitAttachmentRef = builder.objectRef<LyricsKitAttachment>(
  "LyricsKitAttachment",
);

LyricsKitAttachmentRef.implement({
  description: "Attachments to a lyrics line.",
  fields: (t) => ({
    timeTag: t.field({
      type: LyricsKitWordTimeAttachmentRef,
      nullable: true,
      resolve: (a) => a.timeTag ?? null,
    }),
    translation: t.exposeString("translation", { nullable: true }),
    translations: t.field({
      type: "JSONObject",
      resolve: (a) => a.translations,
    }),
    furigana: t.field({
      type: [LyricsKitRangeAttachmentRef],
      nullable: true,
      resolve: (a) => a.furigana ?? null,
    }),
    romaji: t.field({
      type: [LyricsKitRangeAttachmentRef],
      nullable: true,
      resolve: (a) => a.romaji ?? null,
    }),
    role: t.exposeInt("role"),
    minor: t.exposeBoolean("minor"),
  }),
});

export const LyricsKitLyricsLineRef = builder.objectRef<LyricsKitLyricsLine>(
  "LyricsKitLyricsLine",
);

LyricsKitLyricsLineRef.implement({
  description: "A line of parsed lyrics.",
  fields: (t) => ({
    content: t.exposeString("content"),
    position: t.exposeFloat("position", {
      description: "Offset of the line in seconds",
    }),
    attachments: t.field({
      type: LyricsKitAttachmentRef,
      resolve: (l) => l.attachments,
    }),
  }),
});

export const LyricsKitLyricsRef =
  builder.objectRef<LyricsKitLyrics>("LyricsKitLyrics");

LyricsKitLyricsRef.implement({
  description: "Parsed lyrics.",
  fields: (t) => ({
    quality: t.exposeFloat("quality", { nullable: true }),
    lines: t.field({
      type: [LyricsKitLyricsLineRef],
      resolve: (l) => l.lines,
    }),
    length: t.exposeFloat("length", {
      description: "Duration of the lyrics in seconds.",
      nullable: true,
    }),
    translationLanguages: t.exposeStringList("translationLanguages"),
  }),
});
