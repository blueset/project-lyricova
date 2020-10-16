import { Lyrics } from "./lyrics";
import { Attachments, FURIGANA } from "./lyricsLineAttachment";
import { buildTimeTag } from "../utils/regexPattern";

export interface ToLegacyStringOptions {
    before?: string;
    after?: string;
    useFurigana?: boolean;
}

const DefaultToLegacyStringOptions = {
    before: " / ",
    after: "",
    useFurigana: true,
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
        return this.content == other.content &&
            this.position == other.position &&
            // TODO: check attachments
            // this.attachments == other.attachments &&
            this.enabled == other.enabled;
    }

    public toString(): string {
        return [
            this.content, 
            ...Object.entries(this.attachments.content).map((v) => `[${v[0].toString()}]${v[1].toString()}`)
        ].map((v) => `[${this.timeTag.toString()}]${v}`).join("\n");
    }
    public toLegacyString(options: ToLegacyStringOptions = {}): string {
        const {before, after, useFurigana} = Object.assign({}, DefaultToLegacyStringOptions, options);
        let translation = this.attachments.translation();
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

        return `[${this.timeTag}]${content}` + translation;
    }
}