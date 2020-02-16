import { id3TagRegex, lyricsLineRegex, resolveTimeTag, lyricsLineAttachmentRegex, base60TimeRegex } from "./regexPattern";
import { LyricsLine } from "./lyricsLine";
import { LyricsMetadata, ATTACHMENT_TAGS } from "./lyricsMetadata";
import _ from "lodash";
import { OFFSET, LENGTH } from "./idTagKey";

type LyricsMatch = {
    state: "found";
    at: number;
} | {
    state: "notFound";
    insertAt: number;
};

export class Lyrics {
    public lines: LyricsLine[] = [];
    public idTags: { [key: string]: string } = {};
    public metadata: LyricsMetadata = new LyricsMetadata();

    constructor(description: String) {
        for (const match in description.matchAll(id3TagRegex)) {
            const key = match[1].trim(), value = match[2].trim();
            if (value !== "") {
                this.idTags[key] = value;
            }
        }

        const lines: LyricsLine[] = [];
        for (const match in description.matchAll(lyricsLineRegex)) {
            const
                timeTagStr = match[1],
                timeTags = resolveTimeTag(timeTagStr);
            const
                lyricsContentStr = match[2],
                line = new LyricsLine(lyricsContentStr, 0);

            const translationStr = match[3];
            if (translationStr) {
                line.attachments.setTranslation(translationStr);
            }

            lines.push(...timeTags.map((tag) => {
                const l = _.clone(line);
                l.position = tag;
                l.lyrics = this;
                return l;
            }));
        }
        lines.sort((a, b) => a.position - b.position);

        const tags: Set<string> = new Set();
        for (const match in description.matchAll(lyricsLineAttachmentRegex)) {
            const
                timeTagStr = match[1],
                timeTags = resolveTimeTag(timeTagStr);

            const
                attachmentTagStr = match[2],
                attachmentStr = match[3] || "";

            for (const timeTag of timeTags) {
                const indexOutcome = this.lineIndex(timeTag);
                if (indexOutcome.state === "found") {
                    this.lines[indexOutcome.at]
                        .attachments[attachmentTagStr] = attachmentStr;
                }
            }
            tags.add(attachmentTagStr)
        }
        this.metadata.data[ATTACHMENT_TAGS] = tags

        if (this.lines.length === 0) {
            throw new Error(`No valid line is found in this lyric file: ${description}`);
        }
    }

    /**
     * Get the line number of (existing/to insert) lyrics by time offset.
     * @param position Time offset in seconds
     */
    private lineIndex(position: number): LyricsMatch {
        let left = 0, right = this.lines.length - 1;
        while (left < right) {
            const mid = (left + right) / 2, candidate = this.lines[mid];
            if (candidate.position < position) {
                left = mid + 1;
            } else if (position < candidate.position) {
                right = mid - 1;
            } else {
                return {
                    state: "found",
                    at: mid
                };
            }
        }
        return {
            state: "notFound",
            insertAt: left
        }
    }

    public toString(): string {
        const components = Object.entries(this.idTags).map(v => `[${v[0]}:${v[1]}]`);
        components.push(...this.lines.map(v => v.toString()));
        return components.join("\n");
    }

    public legacyToString(): string {
        const components = Object.entries(this.idTags).map(v => `[${v[0]}:${v[1]}]`);
        components.push(...this.lines.map(v => v.toLegacyString()));
        return components.join("\n");
    }

    /** Offset of the lyrics (in milliseconds) */
    get offset(): number {
        return this.idTags[OFFSET] ? parseInt(this.idTags[OFFSET]) : 0;
    }
    set offset(val: number) {
        this.idTags[OFFSET] = `${val}`;
    }

    /** Offset of the lyrics (in seconds) */
    get timeDelay(): number {
        return this.offset / 1000;
    }
    set timeDelay(val: number) {
        this.offset = Math.floor(val * 1000);
    }

    /** Length of the lyrics file (in seconds) */
    get length(): number | undefined {
        const len = this.idTags[LENGTH];
        if (len === undefined) {
            return undefined
        }
        const match = base60TimeRegex.exec(len);
        const
            min = parseFloat(match[1]) || 0,
            sec = parseFloat(match[2]) || 0;
        return min * 60 + sec;
    }
    set length(number: number | undefined) {
        if (number === undefined) {
            this.idTags[LENGTH] = undefined;
        } else {
            // 0-2 digits maximum
            // trim trailing 0 and .00 at the end.
            // This is safe as int would produce "10.00"
            const lengthStr = number.toFixed(2).replace(/\.?0+$/g, "");
            this.idTags[LENGTH] = lengthStr;
        }
    }

    /**
     * Disable all lines of lyrics that satisfy a certain condition.
     * 
     * Note: this would not re-enable lines that doesn't match the condition.
     * @param predicate Condition to check against
     */
    public filtrate(predicate: (LyricsLine) => boolean) {
        for (const index in this.lines) {
            if (!predicate(this.lines[index])) {
                this.lines[index].enabled = false;
            }
        }
    }
}