import { timeLineAttachmentRegex, rangeAttachmentRegex } from "../utils/regexPattern";

/** Range: [a, b) */
type Range = [number, number];

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

interface LyricsLineAttachment { }

export class PlainText implements LyricsLineAttachment {
    public text: string;

    constructor(text: string) {
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
            const timeTag = arg0 as number, index = arg1 as number
            this.timeTag = timeTag;
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

export class WordTimeTag implements LyricsLineAttachment {
    public tags: WordTimeTagLabel[];
    /** Duration in seconds */
    public duration?: number;
    get durationMSec(): number { return Math.floor(this.duration * 1000); }
    set durationMSec(val: number) { this.duration = val / 1000; }

    constructor(description: string);
    constructor(tags: WordTimeTagLabel[], duration?: number);
    constructor(arg0: any, arg1: any = undefined) {
        if (typeof arg0 === "string") {
            const description: string = arg0;
            const matches = description.matchAll(timeLineAttachmentRegex);
            const tags = [];
            for (const match of matches) {
                tags.push(match[1]);
            }
            if (tags.length === 0) {
                throw new Error(`Word time tag attribute has no attachment: ${description}`);
            }
            const match = timeLineAttachmentRegex.exec(description);
            if (match !== null) {
                this.durationMSec = parseInt(match[1])
            }
        } else {
            this.tags = arg0 as WordTimeTagLabel[];
            this.duration = arg1 as number | undefined;
        }
    }
}

export class RangeAttributeLabel {
    public content: string;
    public range: Range;
    constructor(description: string);
    constructor(content: string, range: Range);
    constructor(arg0: string, arg1: Range = undefined) {
        if (typeof arg0 == "number") {
            const content = arg0, range = arg1 as Range
            this.content = content;
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
        return `<${this.content},${this.range[0]},${this.range[0]}>`;
    }
}

export class RangeAttribute implements LyricsLineAttachment {
    public attachment: RangeAttributeLabel[];
    public toString(): string {
        return this.attachment.join("");
    }

    constructor(description: string) {
        const matches = description.matchAll(rangeAttachmentRegex);
        this.attachment = [];
        for (const match of matches) {
            this.attachment.push(new RangeAttributeLabel(match[1]));
        }
        if (this.attachment.length == 0) {
            throw new Error(`Range attribute has no attachment: ${description}`);
        }
    }
}

type AttachmentsContent = {
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
        return (this.content[tag] as PlainText).text;
    }

    public setTranslation(str: string, languageCode: string | undefined = undefined) {
        const tag = makeTranslationTag(languageCode) || TRANSLATION;
        this.content[tag] = Attachments.createAttachment(str, tag);
    }

    public getTag(tag: string): string | undefined {
        return this.content[tag].toString();
    }

    public setTag(tag: string, value: string) {
        this.content[tag] = Attachments.createAttachment(tag, value);
    }

    static createAttachment(str: string, tag: string): LyricsLineAttachment {
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


