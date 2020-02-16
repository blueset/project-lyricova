import { Lyrics } from "./lyrics";
import { Attachments } from "./lyricsLineAttachment";

export class LyricsLine {
    public content: string;
    public position: number;
    public attachments: Attachments;
    public enabled: boolean = true;

    public lyrics?: Lyrics;

    public get timeTag(): string {
        const 
            min = Math.floor(this.position / 60), 
            sec = this.position - min * 60;
        return `${min.toString().padStart(2, "0")}:${sec.toFixed(3).padStart(6, "0")}`;
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
            ...Object.entries(this.attachments.content).map((v) => `[${v[0]}]${v[1]}`)
        ].map((v) => `[${this.timeTag}]${v}`).join("\n");
    }
    public toLegacyString(): string {
        let translation = this.attachments.translation();
        if (translation) {
            translation = `【${translation}】`;
        } else {
            translation = "";
        }
        return `[${this.timeTag}]${this.content}` + translation;
    }
}