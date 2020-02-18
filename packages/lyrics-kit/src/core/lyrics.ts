import { id3TagRegex, lyricsLineRegex, resolveTimeTag, lyricsLineAttachmentRegex, base60TimeRegex } from "../utils/regexPattern";
import { LyricsLine } from "./lyricsLine";
import { LyricsMetadata, ATTACHMENT_TAGS } from "./lyricsMetadata";
import _ from "lodash";
import { OFFSET, LENGTH, ARTIST, TITLE } from "./idTagKey";
import { TIME_TAG, TRANSLATION } from "./lyricsLineAttachment";
import { isCaseInsensitiveSimilar, similarity, similarityIn } from "./stringExtensions";

type LyricsMatch = {
    state: "found";
    at: number;
} | {
    state: "notFound";
    insertAt: number;
};

type CustomSyntaxConfig = {
    idTag?: (key: string, value: string) => string;
    line?: (line: LyricsLine) => string;
}

const mergeTimetagThreshold = 0.02;

export class Lyrics {
    public lines: LyricsLine[] = [];
    public idTags: { [key: string]: string } = {};
    public metadata: LyricsMetadata = new LyricsMetadata();

    /** 
     * Construct Lyrics object from LRCX syntax. 
     * @param description Content in LRCX syntax.
    */
    constructor(description?: string) {
        if (description === undefined) return;

        for (const match of description.matchAll(id3TagRegex)) {
            const key = match[1].trim(), value = match[2].trim();
            if (value !== "") {
                this.idTags[key] = value;
            }
        }

        const lines: LyricsLine[] = [];
        for (const match of description.matchAll(lyricsLineRegex)) {
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
        for (const match of description.matchAll(lyricsLineAttachmentRegex)) {
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
            tags.add(attachmentTagStr);
        }
        this.metadata.data[ATTACHMENT_TAGS] = tags;

        if (lines.length === 0) {
            throw new Error(`No valid line is found in this lyric file: ${description}`);
        }

        this.lines = lines;
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
        };
    }

    /** Build LRCX string. */
    public toString(): string {
        const components = Object.entries(this.idTags).map(v => `[${v[0]}:${v[1]}]`);
        components.push(...this.lines.map(v => v.toString()));
        return components.join("\n");
    }

    /** Build LRCX string in legacy syntax. */
    public legacyToString(): string {
        const components = Object.entries(this.idTags).map(v => `[${v[0]}:${v[1]}]`);
        components.push(...this.lines.map(v => v.toLegacyString()));
        return components.join("\n");
    }

    private static customSyntaxConfig: CustomSyntaxConfig = {
        idTag: (key, val) => `[${key}:${val}]`,
        line: line => line.toString()
    };

    public toCustomSyntax(config: CustomSyntaxConfig): string {
        config = _.defaults(config, Lyrics.customSyntaxConfig);
        const components = Object.entries(this.idTags).map(v => config.idTag(v[0], v[1]));
        components.push(...this.lines.map(config.line));
        return components.join("\n");
    }

    /**
     * Convert to plain LRC text without inline time tag and ruby support.
     * Translations are added with separators.
     */
    public toPlainLRC(separator: string = " / "): string {
        return this.toCustomSyntax({
            line: line => {
                let translation = line.attachments.translation();
                if (translation) {
                    translation = separator + translation;
                } else {
                    translation = "";
                }
                return `[${line.timeTag}]${line.content}` + translation;
            }
        });
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
            return undefined;
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

    /* Sources/LyricsService/Lyrics+Quality.swift */

    private translationFactor = 0.1;
    private wordTimeTagFactor = 0.1;
    private matchedArtistFactor = 1.3;
    private matchedTitleFactor = 1.5;
    private noArtistFactor = 0.7;
    private noTitleFactor = 0.7;
    private noDurationFactor = 0.7;

    public get quality(): number {
        if (this.metadata.quality) {
            return this.metadata.quality;
        }
        let quality = this.artistQuality + this.titleQuality + this.durationQuality;
        if (this.metadata.hasTranslation) {
            quality += this.translationFactor;
        }
        if (this.metadata.attachmentTags.has(TIME_TAG)) {
            quality += this.wordTimeTagFactor;
        }
        this.metadata.quality = quality;
        return quality;
    }

    public isMatched(): boolean {
        const artist = this.idTags[ARTIST], title = this.idTags[TITLE];
        if (artist === undefined || title === undefined) {
            return false;
        }
        const searchTerm = this.metadata.request?.searchTerm;
        if (searchTerm === undefined) {
            return false;
        }
        if (searchTerm.state === "info") {
            return isCaseInsensitiveSimilar(title, searchTerm.title) &&
                isCaseInsensitiveSimilar(artist, searchTerm.artist);
        }
        if (searchTerm.state === "keyword") {
            return isCaseInsensitiveSimilar(title, searchTerm.keyword) &&
                isCaseInsensitiveSimilar(artist, searchTerm.keyword);
        }
        return false;
    }

    private get artistQuality(): number {
        const artist = this.idTags[ARTIST];
        if (artist === undefined) {
            return this.noArtistFactor;
        }
        const searchTerm = this.metadata.request?.searchTerm;
        if (searchTerm.state === "info") {
            if (artist === searchTerm.artist) {
                return this.matchedArtistFactor;
            }
            return similarity(artist, searchTerm.artist);
        }
        if (searchTerm.state === "keyword") {
            if (searchTerm.keyword.indexOf(artist) >= 0) {
                return this.matchedArtistFactor;
            }
            return similarityIn(artist, searchTerm.keyword);
        }
        return this.noArtistFactor;
    }

    private get titleQuality(): number {
        const title = this.idTags[TITLE];
        if (title === undefined) {
            return this.noTitleFactor;
        }
        const searchTerm = this.metadata.request?.searchTerm;
        if (searchTerm.state === "info") {
            if (title === searchTerm.title) {
                return this.matchedTitleFactor;
            }
            return similarity(title, searchTerm.title);
        }
        if (searchTerm.state === "keyword") {
            if (searchTerm.keyword.indexOf(title) >= 0) {
                return this.matchedTitleFactor;
            }
            return similarityIn(title, searchTerm.keyword);
        }
        return this.noTitleFactor;
    }

    private get durationQuality(): number {
        const 
            duration = this.length,
            searchDuration = this.metadata.request?.duration;
        if (searchDuration === undefined) {
            return this.noDurationFactor;
        }
        const absDt = Math.abs(searchDuration - duration);
        if (absDt <= 1) return 1;
        if (1 < absDt && absDt <= 4) return 0.9;
        if (4 < absDt && absDt <= 10) return 0.8;
        return 0.7;
    }

    public merge(other: Lyrics) {
        let index = 0, otherIndex = 0;
        while (index < this.lines.length && otherIndex < other.lines.length) {
            if (Math.abs(this.lines[index].position - other.lines[index].position) < mergeTimetagThreshold) {
                const transStr = other.lines[otherIndex].content;
                if (transStr !== "") {
                    this.lines[index].attachments.setTranslation(transStr);
                }
                index ++; otherIndex ++;
            } else if (this.lines[index].position > other.lines[otherIndex].position) {
                otherIndex ++;
            } else {
                index ++;
            }
        }
        this.metadata.attachmentTags.add(TRANSLATION);
    }

    /** Merge without matching timetag */
    public forceMerge(other: Lyrics) {
        if (this.lines.length !== other.lines.length) return;
        for (let i = 0; i < this.lines.length; i++) {
            const otherStr = other.lines[i].content;
            if (otherStr !== "") {
                this.lines[i].attachments.setTranslation(otherStr);
            }
        }
        this.metadata.attachmentTags.add(TRANSLATION);
    }
}