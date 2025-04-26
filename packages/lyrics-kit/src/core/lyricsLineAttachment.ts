import {
  rangeAttachmentRegex,
  timeLineAttachmentDurationRegex,
  timeLineAttachmentRegex,
} from "../utils/regexPattern";
import {
  WordTimeTagJSON,
  RangeAttributeJSON,
  PlainTextJSON,
  AttachmentsJSON,
  AttachmentJSON,
  NumberArrayJson,
  Number2DArrayJson,
} from "./attachmentTypes";

/** Range: [a, b) */
export type Range = [number, number];

/** Attribute tag values */
export const TRANSLATION = "tr";
export const TIME_TAG = "tt";
export const FURIGANA = "fu";
export const ROMAJI = "ro";
export const METADATA_ROLE = "meta:role";
export const METADATA_MINOR = "meta:minor";
export const DOTS = "dots";
export const TAGS = "tags";

function makeTranslationTag(languageCode: string | null): string {
  if (languageCode) return `${TRANSLATION}:${languageCode}`;
  return TRANSLATION;
}

export function isTranslationTag(tag: string): boolean {
  return tag.startsWith(TRANSLATION);
}

abstract class LyricsLineAttachment {
  abstract toJSON(): AttachmentJSON;
}

export class PlainText extends LyricsLineAttachment {
  public text: string;

  constructor(text: string) {
    super();
    this.text = text;
  }

  public toString(): string {
    return this.text;
  }

  public toJSON(): PlainTextJSON {
    return {
      type: "plain_text",
      text: this.text,
    };
  }

  public static fromJSON(json: PlainTextJSON): PlainText {
    return new PlainText(json.text);
  }
}

export class WordTimeTagLabel {
  public index: number;
  /** Time tag in seconds */
  public timeTag: number;

  constructor(description: string);
  constructor(timeTag: number, index: number);
  constructor(arg0: number | string, arg1?: number) {
    if (typeof arg0 === "number") {
      const index = arg1 as number;
      this.timeTag = arg0;
      this.index = index;
    } else {
      const description = arg0;
      const components = description.split(",");
      if (components.length !== 2) throw new Error("Invalid time tag format");
      const msec = parseInt(components[0]),
        index = parseInt(components[1]);
      this.timeTag = msec / 1000;
      this.index = index;
    }
  }

  get timeTagMSec(): number {
    return Math.floor(this.timeTag * 1000);
  }

  set timeTagMSec(val: number) {
    this.timeTag = val / 1000;
  }

  public toString(): string {
    return `<${this.timeTagMSec},${this.index}>`;
  }
}

export class WordTimeTag extends LyricsLineAttachment {
  public tags: WordTimeTagLabel[];
  /** Duration in seconds */
  public duration?: number;

  constructor(description: string);
  constructor(tags: WordTimeTagLabel[], duration?: number);
  constructor(arg0: string | WordTimeTagLabel[], arg1?: number) {
    super();
    if (typeof arg0 === "string") {
      const description = arg0;
      const tags = [...description.matchAll(timeLineAttachmentRegex)].map(
        v => new WordTimeTagLabel(v[1])
      );
      if (tags.length === 0) {
        throw new Error(`Word time tag attribute has no attachment: ${description}`);
      }
      this.tags = tags;

      const match = description.match(timeLineAttachmentDurationRegex);
      if (match !== null) {
        this.duration = parseInt(match[1]) / 1000;
      }
    } else {
      this.tags = arg0;
      this.duration = arg1;
    }
  }

  get durationMSec(): number {
    return Math.floor((this.duration || 0) * 1000);
  }

  set durationMSec(val: number) {
    this.duration = val / 1000;
  }

  public toString(): string {
    return this.tags.map(x => x.toString()).join("");
  }

  public toJSON(): WordTimeTagJSON {
    return {
      type: "time_tag",
      tags: this.tags.map(tag => ({
        timeTag: tag.timeTag,
        index: tag.index,
      })),
      duration: this.duration,
    };
  }

  public static fromJSON(json: WordTimeTagJSON): WordTimeTag {
    const tags = json.tags.map(tag => new WordTimeTagLabel(tag.timeTag, tag.index));
    return new WordTimeTag(tags, json.duration);
  }
}

export class RangeAttributeLabel {
  public content: string;
  public range: Range;

  constructor(description: string);
  constructor(content: string, range: Range);
  constructor(arg0: string, arg1?: Range) {
    if (Array.isArray(arg1)) {
      this.content = arg0;
      this.range = arg1;
    } else {
      const description = arg0;
      const components = description.split(",");
      if (components.length !== 3) {
        throw new Error(`Range attribute tag doesn't have 3 components: ${description}`);
      }
      const lb = parseInt(components[1]),
        ub = parseInt(components[2]);
      if (lb >= ub) {
        throw new Error(`Range attribute tag has an invalid range: ${description}`);
      }
      this.content = components[0];
      this.range = [lb, ub];
    }
  }

  public toString(): string {
    return `<${this.content},${this.range[0]},${this.range[1]}>`;
  }
}

export class RangeAttribute extends LyricsLineAttachment {
  public attachment: RangeAttributeLabel[];

  constructor(description: string);
  constructor(attachments: [string, Range][]);
  constructor(value: string | [string, Range][]) {
    super();
    this.attachment = [];
    if (typeof value === "string") {
      const matches = value.matchAll(rangeAttachmentRegex);
      for (const match of matches) {
        this.attachment.push(new RangeAttributeLabel(match[1]));
      }
    } else if (Array.isArray(value)) {
      for (const [content, range] of value) {
        this.attachment.push(new RangeAttributeLabel(content, range));
      }
    }
    if (this.attachment.length === 0) {
      throw new Error(`Range attribute has no attachment: ${value}`);
    }
  }

  public toString(): string {
    return this.attachment.join("");
  }

  public toJSON(): RangeAttributeJSON {
    return {
      type: "range",
      attachment: this.attachment.map(label => ({
        content: label.content,
        range: label.range,
      })),
    };
  }

  public static fromJSON(json: RangeAttributeJSON): RangeAttribute {
    const attachments: [string, Range][] = json.attachment.map(label => [
      label.content,
      label.range,
    ]);
    return new RangeAttribute(attachments);
  }
}

export class NumberArray extends LyricsLineAttachment {
  public attachment: number[];

  constructor(description: string);
  constructor(attachments: number[]);
  constructor(value: string | number[]) {
    super();
    if (typeof value === "string") {
      this.attachment = value.split(",").map(v => parseInt(v));
    } else {
      this.attachment = value;
    }
  }

  public toString(): string {
    return this.attachment.join(",");
  }

  public toJSON(): NumberArrayJson {
    return {
      type: "number_array",
      values: this.attachment,
    };
  }
}

export class Number2DArray extends LyricsLineAttachment {
  public attachment: number[][];

  constructor(description: string);
  constructor(attachments: number[][]);
  constructor(value: string | number[][]) {
    super();
    if (typeof value === "string") {
      this.attachment = value
        .split(",")
        .map(v => (v ? v.split("/").map(v2 => parseInt(v2) / 1000) : []));
    } else {
      this.attachment = value;
    }
  }

  public toString(): string {
    return this.attachment.map(arr => arr.map(v => Math.floor(v * 1000)).join("/")).join(",");
  }

  public toJSON(): Number2DArrayJson {
    return {
      type: "number_2d_array",
      values: this.attachment,
    };
  }
}

export type AttachmentsContent = {
  [TIME_TAG]?: WordTimeTag;
  [TRANSLATION]?: PlainText;
  [FURIGANA]?: RangeAttribute;
  [ROMAJI]?: RangeAttribute;
  [METADATA_ROLE]?: PlainText;
  [METADATA_MINOR]?: PlainText;
  [DOTS]?: NumberArray;
  [TAGS]?: Number2DArray;
  [key: string]: LyricsLineAttachment | undefined;
};

export class Attachments {
  public content: AttachmentsContent;

  constructor(attachments: AttachmentsContent = {}) {
    this.content = attachments;
  }

  get timeTag(): WordTimeTag | null {
    return this.content[TIME_TAG] || null;
  }

  set timeTag(value: WordTimeTag | null) {
    if (value === null) {
      delete this.content[TIME_TAG];
    } else {
      this.content[TIME_TAG] = value;
    }
  }

  /**
   * Specifies the singer of the line, where the default value 0 is usually the main singer.
   * Up to 3 roles (0, 1, 2) are supported in Lyricova Jukebox.
   */
  get role(): number {
    const roleAttachment = this.content[METADATA_ROLE];
    return roleAttachment ? parseInt(roleAttachment.toString()) : 0;
  }

  set role(value: number) {
    if (value === 0) {
      delete this.content[METADATA_ROLE];
    } else {
      this.content[METADATA_ROLE] = new PlainText(value.toString());
    }
  }

  /**
   * Specifies if the line should be rendered in a smaller size. Default is false.
   */
  get minor(): boolean {
    return this.content[METADATA_MINOR]?.toString() === "1";
  }

  set minor(value: boolean) {
    if (value) {
      this.content[METADATA_MINOR] = new PlainText("1");
    } else {
      delete this.content[METADATA_MINOR];
    }
  }

  public translation(languageCode?: string): string | undefined {
    const tag = makeTranslationTag(languageCode || null);
    const translation = this.content[tag];
    return translation instanceof PlainText ? translation.text : undefined;
  }

  public get translations(): Record<string, string> {
    const tags = Object.keys(this.content).filter(isTranslationTag);
    const mapping: Record<string, string> = {};
    for (const tag of tags) {
      const attachment = this.content[tag];
      if (attachment instanceof PlainText) {
        mapping[tag.substring(3)] = attachment.text;
      }
    }
    return mapping;
  }

  public setTranslation(str: string, languageCode?: string): void {
    const tag = makeTranslationTag(languageCode || null);
    if (str) {
      this.content[tag] = new PlainText(str);
    } else {
      delete this.content[tag];
    }
  }

  public getTag(tag: string): string | undefined {
    return this.content[tag]?.toString();
  }

  public setTag(tag: string, value: string): void {
    switch (tag) {
      case TIME_TAG:
        this.content[tag] = new WordTimeTag(value);
        break;
      case FURIGANA:
      case ROMAJI:
        this.content[tag] = new RangeAttribute(value);
        break;
      case DOTS:
        this.content[tag] = new NumberArray(value);
        break;
      case TAGS:
        this.content[tag] = new Number2DArray(value);
        break;
      default:
        this.content[tag] = new PlainText(value);
    }
  }

  public toJSON(): AttachmentsJSON {
    const json: AttachmentsJSON = {};
    for (const [key, value] of Object.entries(this.content)) {
      if (value) {
        json[key] = value.toJSON();
      }
    }
    return json;
  }

  public static fromJSON(json: AttachmentsJSON): Attachments {
    const content: AttachmentsContent = {};

    for (const [key, value] of Object.entries(json)) {
      const attachment = value as AttachmentJSON;
      switch (attachment.type) {
        case "time_tag":
          content[key] = WordTimeTag.fromJSON(attachment);
          break;
        case "range":
          content[key] = RangeAttribute.fromJSON(attachment);
          break;
        case "plain_text":
          content[key] = PlainText.fromJSON(attachment);
          break;
        case "number_array":
          content[key] = new NumberArray(attachment.values);
          break;
        case "number_2d_array":
          content[key] = new Number2DArray(attachment.values);
          break;
      }
    }

    return new Attachments(content);
  }
}
