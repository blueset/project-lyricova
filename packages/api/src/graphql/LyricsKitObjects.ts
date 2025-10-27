import { ObjectType, Field, Float, Int, InputType } from "type-graphql";
import type {
  Lyrics,
  LyricsLine,
  Attachments,
  WordTimeTag,
  WordTimeTagLabel,
  RangeAttributeLabel,
} from "lyrics-kit/core";
import { FURIGANA, ROMAJI } from "lyrics-kit/core";
import { GraphQLJSONObject } from "graphql-type-json";

/**
 * @openapi
 * components:
 *   schemas:
 *     LyricsKitRangeAttachment:
 *       type: object
 *       description: Furigana/romaji to words in a lyrics line.
 *       properties:
 *         content:
 *           type: string
 *           description: Furigana/romaji content
 *           example: "さい"
 *         leftIndex:
 *           type: integer
 *           description: Starting character per Extended Grapheme Cluster (including)
 *           example: 1
 *         rightIndex:
 *           type: integer
 *           description: Ending character per Extended Grapheme Cluster (excluding)
 *           example: 2
 *       required:
 *         - content
 *         - leftIndex
 *         - rightIndex
 */
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

/**
 * @openapi
 * components:
 *   schemas:
 *     LyricsKitWordTimeTag:
 *       type: object
 *       description: Time tag per word to a lyrics line.
 *       properties:
 *         timeTag:
 *           type: number
 *           format: float
 *           description: Time when the time tag happens, in seconds.
 *           example: 0.515
 *         index:
 *           type: integer
 *           description: Starting character per Extended Grapheme Cluster of this tag
 *           example: 1
 *       required:
 *         - timeTag
 *         - index
 */
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

/**
 * @openapi
 * components:
 *   schemas:
 *     LyricsKitWordTimeAttachment:
 *       type: object
 *       description: Time tag per word to a lyrics line.
 *       properties:
 *         duration:
 *           oneOf:
 *             - type: number
 *               format: float
 *             - type: 'null'
 *           description: Duration of line in seconds.
 *         tags:
 *           example: [{"timeTag": 0, "index": 1},{"timeTag": 0.515, "index": 2},{"timeTag": 1.295, "index": 3},{"timeTag": 1.799, "index": 4},{"timeTag": 2.057, "index": 5},{"timeTag": 2.393, "index": 6},{"timeTag": 2.751, "index": 7},{"timeTag": 3.001, "index": 8},{"timeTag": 3.304, "index": 9}]
 *           oneOf:
 *             - type: array
 *               items:
 *                 $ref: '#/components/schemas/LyricsKitWordTimeTag'
 *             - type: 'null'
 *           description: Tags in the line.
 *       required:
 *         - tags
 */
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

/**
 * @openapi
 * components:
 *   schemas:
 *     LyricsKitAttachment:
 *       type: object
 *       description: Attachments to a lyrics line.
 *       properties:
 *         timeTag:
 *           oneOf:
 *             - $ref: '#/components/schemas/LyricsKitWordTimeAttachment'
 *             - type: 'null'
 *         translation:
 *           description: Translation of unspecified language
 *           example: null
 *           oneOf:
 *             - type: string
 *             - type: 'null'
 *         translations:
 *           type: object
 *           additionalProperties:
 *             type: string
 *           description: Translation by language code
 *           example:
 *            en: "\u003CA farewell song at my highest speed\u003E"
 *            zh: "＜最高速的離別之歌＞"
 *         furigana:
 *           example: [{"content": "さい", "leftIndex": 1, "rightIndex": 2}, {"content": "こう", "leftIndex": 2, "rightIndex": 3}, {"content": "そく", "leftIndex": 3, "rightIndex": 4}, {"content": "わか", "leftIndex": 5, "rightIndex": 6}, {"content": "うた", "leftIndex": 8, "rightIndex": 9}]
 *           oneOf:
 *             - type: array
 *               items:
 *                 $ref: '#/components/schemas/LyricsKitRangeAttachment'
 *             - type: 'null'
 *         romaji:
 *           example: null
 *           oneOf:
 *             - type: array
 *               items:
 *                 $ref: '#/components/schemas/LyricsKitRangeAttachment'
 *             - type: 'null'
 *         role:
 *           type: integer
 *           description: Role of the line
 *         minor:
 *           type: boolean
 *           description: Whether this line is minor (e.g., backing vocals)
 *       required:
 *         - translations
 *         - role
 *         - minor
 */
@ObjectType({ description: "Attachments to a lyrics line." })
export class LyricsKitAttachment {
  constructor(attachment: Attachments) {
    this.translation = attachment.translation() || null;
    this.translations = attachment.translations;
    const timeTag = attachment.timeTag;
    this.timeTag = timeTag && new LyricsKitWordTimeAttachment(timeTag);
    this.furigana = null;
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
    this.role = attachment.role;
    this.minor = attachment.minor;
  }

  @Field((type) => LyricsKitWordTimeAttachment, { nullable: true })
  timeTag?: LyricsKitWordTimeAttachment;

  @Field({ nullable: true })
  translation?: string;

  @Field((type) => GraphQLJSONObject)
  translations: { [key: string]: string };

  @Field((type) => [LyricsKitRangeAttachment], { nullable: true })
  furigana?: LyricsKitRangeAttachment[];

  @Field((type) => [LyricsKitRangeAttachment], { nullable: true })
  romaji?: LyricsKitRangeAttachment[];

  @Field((type) => Int)
  role = 0;

  @Field((type) => Boolean)
  minor = false;
}

/**
 * @openapi
 * components:
 *   schemas:
 *     LyricsKitLyricsLine:
 *       type: object
 *       description: A line of parsed lyrics.
 *       properties:
 *         content:
 *           type: string
 *           description: The text content of the lyrics line
 *           example: "＜最高速の別れの歌＞"
 *         position:
 *           type: number
 *           format: float
 *           description: Offset of the line in seconds
 *           example: 120.082
 *         attachments:
 *           $ref: '#/components/schemas/LyricsKitAttachment'
 *       required:
 *         - content
 *         - position
 *         - attachments
 */
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

/**
 * @openapi
 * components:
 *   schemas:
 *     LyricsKitLyrics:
 *       type: object
 *       description: Parsed lyrics.
 *       properties:
 *         quality:
 *           oneOf:
 *             - type: number
 *               format: float
 *             - type: 'null'
 *           description: Quality rating of the lyrics
 *         lines:
 *           type: array
 *           description: Array of lyrics lines
 *           items:
 *             $ref: '#/components/schemas/LyricsKitLyricsLine'
 *         length:
 *           oneOf:
 *             - type: number
 *               format: float
 *             - type: 'null'
 *           description: Duration of the lyrics in seconds.
 *         translationLanguages:
 *           type: array
 *           description: Available translation language codes
 *           items:
 *             type: string
 *             example: "en"
 *       required:
 *         - lines
 *         - translationLanguages
 */
@ObjectType({ description: "Parsed lyrics." })
export class LyricsKitLyrics {
  constructor(lyrics: Lyrics) {
    this.quality = lyrics.quality;
    this.length = lyrics.length;
    this.lines = lyrics.lines.map(
      (v) => new LyricsKitLyricsLine(v, lyrics.timeDelay)
    );
    this.translationLanguages = lyrics.translationLanguages;
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

  @Field((type) => [String])
  translationLanguages: string[];
}
