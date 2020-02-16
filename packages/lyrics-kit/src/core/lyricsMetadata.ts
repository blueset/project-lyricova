import { isTranslationTag } from "./lyricsLineAttachment";

export const ATTACHMENT_TAGS = "attachmentTags";

export class LyricsMetadata {
    public data: {[key: string]: any} = {};
    /* Lyrics.Metadata.Key is mapped to string */
    public toString(): string {
        return Object
            .entries(this)
            .map(v => `[${v[0]}:${v[1]}]`)
            .join("\n");
    }

    public get attachmentTags(): Set<string> {
        return this.data[ATTACHMENT_TAGS] || new Set();
    }
    public set attachmentTags(val: Set<string>) {
        this.data[ATTACHMENT_TAGS] = val;
    }

    public get hasTranslation(): boolean {
        for (const tag in this.attachmentTags) {
            if (isTranslationTag(tag)) return true;
        }
        return false;
    }
}