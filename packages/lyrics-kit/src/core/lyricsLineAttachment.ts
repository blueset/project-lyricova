import { rangeAttachmentRegex, timeLineAttachmentDurationRegex, timeLineAttachmentRegex } from "../utils/regexPattern";

/** Range: [a, b) */
export type Range = [number, number];

/** Attribute tag values */
export const TRANSLATION = "tr";
export const TIME_TAG = "tt";
export const FURIGANA = "fu";
export const ROMAJI = "ro";

function makeTranslationTag(languageCode: string | null): string {
    if (languageCode)
        return `${TRANSLATION}:${languageCode}`;
    return TRANSLATION;
}

export function isTranslationTag(tag: string): boolean {
    return tag.startsWith(TRANSLATION);
}

abstract class LyricsLineAttachment {}

export class PlainText extends LyricsLineAttachment {
    public text: string;

    constructor(text: string) {
        super();
        this.text = text;
    }

    public toString(): string {
        return this.text;
    }
}

export class WordTimeTagLabel {
    public index: number;
    /** Time tag in seconds */
    public timeTag: number;

    constructor(description: string);
    constructor(timeTag: number, index: number);
    constructor(arg0: number | string, arg1: number | undefined = undefined) {
        if (typeof arg0 == "number") {
            const index = arg1 as number;
            this.timeTag = arg0 as number;
            this.index = index;
        } else {
            const description = arg0 as string;
            const components = description.split(",");
            if (components.length != 2) return;
            const msec = parseInt(components[0]),
                  index = parseInt(components[1]);
            this.timeTag = msec / 1000;
            this.index = index;
        }
    }

    get timeTagMSec(): number { return Math.floor(this.timeTag * 1000); }
    set timeTagMSec(val: number) { this.timeTag = val / 1000; }

    public toString(): string {
        return `<${this.timeTagMSec},${this.index}>`;
    }
}

export class WordTimeTag extends LyricsLineAttachment {
    public tags: WordTimeTagLabel[];
    /** Duration in seconds */
    public duration?: number;
    get durationMSec(): number { return Math.floor(this.duration * 1000); }
    set durationMSec(val: number) { this.duration = val / 1000; }

    constructor(description: string);
    constructor(tags: WordTimeTagLabel[], duration?: number);
    constructor(arg0: string | WordTimeTagLabel[], arg1: number = undefined) {
        super();
        if (typeof arg0 === "string") {
            const description: string = arg0;
            const tags = [...description.matchAll(timeLineAttachmentRegex)].map(v => new WordTimeTagLabel(v[1]));
            if (tags.length === 0) {
                throw new Error(`Word time tag attribute has no attachment: ${description}`);
            }
            this.tags = tags;

            const match = description.match(timeLineAttachmentDurationRegex);
            if (match !== null) {
                this.durationMSec = parseInt(match[1]);
            }
        } else {
            this.tags = arg0 as WordTimeTagLabel[];
            this.duration = arg1 as number | undefined;
        }
    }

    public toString(): string {
        let text = this.tags.map(x => x.toString()).join();
        if (this.duration) {
            text += `<${this.durationMSec}>`;
        }
        return text;
    }
}

export class RangeAttributeLabel {
    public content: string;
    public range: Range;
    constructor(description: string);
    constructor(content: string, range: Range);
    constructor(arg0: string, arg1: Range = undefined) {
        if (Array.isArray(arg1)) {
            const range = arg1 as Range;
            this.content = arg0;
            this.range = range;
        } else {
            const description = arg0;
            const components = description.split(",");
            if (components.length != 3) {
                throw new Error(`Range attribute tag doesn't has 3 components: ${description}`);
            }
            const lb = parseInt(components[1]), ub = parseInt(components[2]);
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
    public toString(): string {
        return this.attachment.join("");
    }

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
        } else if (typeof value === "object") {
            for (const [content, range] of value) {
                this.attachment.push(new RangeAttributeLabel(content, range));
            }
        }
        if (this.attachment.length == 0) {
            throw new Error(`Range attribute has no attachment: ${value}`);
        }
        
    }
}

export type AttachmentsContent = {
    [TIME_TAG]?: WordTimeTag;
    [TRANSLATION]?: PlainText;
    [FURIGANA]?: RangeAttribute;
    [ROMAJI]?: RangeAttribute;
    [key: string]: LyricsLineAttachment;
};

export class Attachments {
    public content: AttachmentsContent;

    constructor(attachments: AttachmentsContent = {}) {
        this.content = attachments;
    }

    /* Attachments.Tag is translated to string */

    get timeTag(): WordTimeTag | null {
        return this.content[TIME_TAG] || null;
    }

    set timeTag(value: WordTimeTag | null) {
        this.content[TIME_TAG] = value;
    }

    public translation(languageCode: string | undefined = undefined): string | undefined {
        const tag = makeTranslationTag(languageCode) || TRANSLATION;
        return this.content[tag] && (this.content[tag] as PlainText).text;
    }

    public setTranslation(str: string, languageCode: string | undefined = undefined): void {
        const tag = makeTranslationTag(languageCode) || TRANSLATION;
        this.content[tag] = Attachments.createAttachment(tag, str);
    }

    public getTag(tag: string): string | undefined {
        return this.content[tag] && this.content[tag].toString();
    }

    public setTag(tag: string, value: string): void {
        this.content[tag] = Attachments.createAttachment(tag, value);
    }

    static createAttachment(tag: string, str: string): LyricsLineAttachment {
        switch (tag) {
            case TIME_TAG:
                return new WordTimeTag(str);
            case FURIGANA:
            case ROMAJI:
                return new RangeAttribute(str);
            default:
                return new PlainText(str);
        }
    }
}


