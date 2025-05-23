import { Lyrics } from "./lyrics";
import { Attachments, FURIGANA } from "./lyricsLineAttachment";
import { buildTimeTag } from "../utils/regexPattern";

export interface LyricsLineJSON {
  content: string;
  position: number;
  attachments: ReturnType<Attachments["toJSON"]>;
  enabled: boolean;
}

export interface ToLegacyStringOptions {
  before?: string;
  after?: string;
  useFurigana?: boolean;
  translationLanguage?: string;
}

const DefaultToLegacyStringOptions = {
  before: " / ",
  after: "",
  useFurigana: true,
  translationLanguage: undefined,
};

export class LyricsLine {
  public content: string;
  public position: number;
  public attachments: Attachments;
  public enabled = true;

  public lyrics?: Lyrics;

  public get timeTag(): string {
    return buildTimeTag(this.position);
  }

  constructor(content: string, position: number, attachments: Attachments = new Attachments()) {
    this.content = content;
    this.position = position;
    this.attachments = attachments;
  }

  public isEqual(other: LyricsLine): boolean {
    return (
      this.content == other.content &&
      this.position == other.position &&
      // TODO: check attachments
      // this.attachments == other.attachments &&
      this.enabled == other.enabled
    );
  }

  public toString(): string {
    const timeTag = this.timeTag;
    const timeLabel = timeTag ? `[${timeTag}]` : "";
    return [
      this.content,
      ...Object.entries(this.attachments.content).map(
        v => `[${v[0].toString()}]${v[1].toString()}`
      ),
    ]
      .map(v => `${timeLabel}${v}`)
      .join("\n");
  }

  public toLegacyString(options: ToLegacyStringOptions = {}): string {
    const { before, after, useFurigana, translationLanguage } = Object.assign(
      {},
      DefaultToLegacyStringOptions,
      options
    );
    let translation = this.attachments.translation(translationLanguage);
    if (translation) {
      translation = `${before}${translation}${after}`;
    } else {
      translation = "";
    }

    // Apply furigana
    let content = "";
    if (useFurigana && this?.attachments?.content?.[FURIGANA]) {
      const base = this.content;
      let lastIndex = 0;
      for (const label of this.attachments.content[FURIGANA].attachment) {
        content += base.substring(lastIndex, label.range[1]) + `(${label.content})`;
        lastIndex = label.range[1];
      }
      if (lastIndex < base.length) {
        content += base.substring(lastIndex, base.length);
      }
    } else {
      content = this.content;
    }

    const timeTag = this.timeTag;
    const timeLabel = timeTag ? `[${timeTag}]` : "";
    const linePrefix = this.attachments.minor ? "(" : "";
    const lineSuffix = this.attachments.minor ? ")" : "";

    return `${timeLabel}${linePrefix}${content}${translation}${lineSuffix}`;
  }
  public toJSON(): LyricsLineJSON {
    return {
      content: this.content,
      position: this.position,
      attachments: this.attachments.toJSON(),
      enabled: this.enabled,
    };
  }

  public static fromJSON(json: LyricsLineJSON): LyricsLine {
    const line = new LyricsLine(
      json.content,
      json.position,
      Attachments.fromJSON(json.attachments)
    );
    line.enabled = json.enabled;
    return line;
  }
}
