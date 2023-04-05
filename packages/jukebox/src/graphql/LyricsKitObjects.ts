import { ObjectType, Field, Float, Int, InputType } from "type-graphql";
import type {
  Lyrics,
  LyricsLine,
  Attachments,
  WordTimeTag,
  WordTimeTagLabel,
  RangeAttributeLabel} from "lyrics-kit/core";
import {
  FURIGANA,
  ROMAJI
} from "lyrics-kit/core";

@ObjectType({ description: "Furigana/romaji to words in a lyrics line." })
export class LyricsKitRangeAttachment {
  constructor(tag: RangeAttributeLabel) {
    if (tag) {
      this.content = tag.content;
      this.leftIndex = tag.range[0];
      this.rightIndex = tag.range[1];
    }
  }

  @Field({ description: "Furigana/romaji content" })
  content: string;

  @Field((type) => Int, {
    description: "Starting character per Extended Grapheme Cluster (including)",
  })
  leftIndex: number;

  @Field((type) => Int, {
    description: "Ending character per Extended Grapheme Cluster (excluding)",
  })
  rightIndex: number;
}

@ObjectType({ description: "Time tag per word to a lyrics line." })
export class LyricsKitWordTimeTag {
  constructor(tag: WordTimeTagLabel) {
    this.timeTag = tag.timeTag;
    this.index = tag.index;
  }

  @Field((type) => Float, {
    description: "Time when the time tag happens, in seconds.",
  })
  timeTag: number;

  @Field((type) => Int, {
    description: "Starting character per Extended Grapheme Cluster of this tag",
  })
  index: number;
}

@ObjectType({ description: "Time tag per word to a lyrics line." })
export class LyricsKitWordTimeAttachment {
  constructor(wordTime: WordTimeTag) {
    this.duration = wordTime.duration;
    this.tags = wordTime.tags.map(
      (v: WordTimeTagLabel) => new LyricsKitWordTimeTag(v)
    );
  }

  @Field((type) => Float, {
    description: "Duration of line in seconds.",
    nullable: true,
  })
  duration: number;

  @Field((type) => [LyricsKitWordTimeTag], {
    description: "Tags in the line.",
    nullable: true,
  })
  tags: LyricsKitWordTimeTag[];
}

@ObjectType({ description: "Attachments to a lyrics line." })
export class LyricsKitAttachment {
  constructor(attachment: Attachments) {
    this.translation = attachment.translation() || null;
    const timeTag = attachment.timeTag;
    this.timeTag = timeTag && new LyricsKitWordTimeAttachment(timeTag);
    this.furigana = null;
    this.romaji = null;
    if (attachment.content[FURIGANA]) {
      this.furigana = attachment.content[FURIGANA].attachment.map(
        (v) => new LyricsKitRangeAttachment(v)
      );
    }
    if (attachment.content[ROMAJI]) {
      this.romaji = attachment.content[ROMAJI].attachment.map(
        (v) => new LyricsKitRangeAttachment(v)
      );
    }
  }

  @Field((type) => LyricsKitWordTimeAttachment, { nullable: true })
  timeTag?: LyricsKitWordTimeAttachment;

  @Field({ nullable: true })
  translation?: string;

  @Field((type) => [LyricsKitRangeAttachment], { nullable: true })
  furigana?: LyricsKitRangeAttachment[];

  @Field((type) => [LyricsKitRangeAttachment], { nullable: true })
  romaji?: LyricsKitRangeAttachment[];
}

@ObjectType({ description: "A line of parsed lyrics." })
export class LyricsKitLyricsLine {
  constructor(line: LyricsLine, timeDelay: number) {
    this.content = line.content;
    this.position = line.position - timeDelay;
    this.attachments = new LyricsKitAttachment(line.attachments);
  }

  @Field()
  content: string;

  @Field((type) => Float, { description: "Offset of the line in seconds" })
  position: number;

  @Field((type) => LyricsKitAttachment)
  attachments: LyricsKitAttachment;
}

@ObjectType({ description: "Parsed lyrics." })
export class LyricsKitLyrics {
  constructor(lyrics: Lyrics) {
    this.quality = lyrics.quality;
    this.length = lyrics.length;
    this.lines = lyrics.lines.map(
      (v) => new LyricsKitLyricsLine(v, lyrics.timeDelay)
    );
  }

  @Field((type) => Float, { nullable: true })
  quality?: number;

  @Field((type) => [LyricsKitLyricsLine])
  lines: LyricsKitLyricsLine[];

  @Field((type) => Float, {
    description: "Duration of the lyrics in seconds.",
    nullable: true,
  })
  length?: number;
}
