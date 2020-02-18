import { LyricsProvider } from ".";
import { LyricsProviderSource } from "../lyricsProviderSource";
import { LyricsSearchRequest } from "../lyricsSearchRequest";
import axios from "axios";
import { Lyrics } from "../../core/lyrics";
import { gunzipSync } from "zlib";
import { id3TagRegex, krcLineRegex, kugouInlineTagRegex } from "../../utils/regexPattern";
import { WordTimeTag, WordTimeTagLabel, Attachments, TIME_TAG, TRANSLATION } from "../../core/lyricsLineAttachment";
import { LyricsLine } from "../../core/lyricsLine";
import _ from "lodash";
import { LRC_BY, TITLE, ARTIST } from "../../core/idTagKey";

const SEARCH_URL = "http://lyrics.kugou.com/search";
const LYRICS_URL = "http://lyrics.kugou.com/download";

const decodeKey = Buffer.from([64, 71, 97, 119, 94, 50, 116, 71, 81, 54, 49, 45, 206, 210, 110, 105]);
const flagKey = Buffer.from("krc1", "ascii");

/**
 * Decrypt KRC data
 * @param base64 KRC data to decrypt
 * @throws Error when data is invalid
 */
function decryptKrc(base64: string): string {
    let buffer = Buffer.from(base64, "base64");
    if (buffer.indexOf(flagKey) !== 0) {
        throw new Error("KRC magic number not found.");
    }
    buffer = buffer.slice(4);
    for (let i = 0; i < buffer.length; i++) {
        buffer[i] = buffer[i] ^ decodeKey[i & 0b1111];
    }
    const unarchivedData = gunzipSync(buffer);
    return unarchivedData.toString();
}

class KugouKRCLyrics extends Lyrics {
    constructor(content: string) {
        super();
        let languageHeader: KugouKrcHeaderField | null = null;
        const matches = content.matchAll(id3TagRegex);
        for (const match in matches) {
            const key = match[1].trim(), value = match[2].trim();
            if (!key || !value) {
                continue;
            }
            if (key === "language") {
                const data = Buffer.from(value, "base64").toString();
                if (data) {
                    languageHeader = JSON.parse(data);
                }
            } else {
                this.idTags[key] = value;
            }
            this.idTags[key] = value;
        }
        
        const krcLineMatches = content.matchAll(krcLineRegex);
        const lines: LyricsLine[] = [];
        for (const match of krcLineMatches) {
            const
                timeTagStr = match[1],
                timeTag = parseFloat(timeTagStr) / 1000,
                durationStr = match[2],
                duration = parseFloat(durationStr) / 1000;

            let lineContent = "";
            const attachment = new WordTimeTag(
                [new WordTimeTagLabel(0, 0)], duration
            );
            const inlineTagMatches = match[3].matchAll(kugouInlineTagRegex);
            for (const m of inlineTagMatches) {
                const t1 = parseInt(m[1]), t2 = parseInt(m[2]), t = (t1 + t2) / 1000;
                const fragment = m[3];
                const prevCount = lineContent.length;
                lineContent += fragment;
                if (lineContent.length > prevCount) {
                    attachment.tags.push(new WordTimeTagLabel(t, lineContent.length));
                }
            }

            const att = new Attachments({ TIME_TAG: attachment });
            const line = new LyricsLine(lineContent, timeTag, att);
            line.lyrics = this;
            lines.push(line);
        }

        this.metadata.attachmentTags.add(TIME_TAG);

        // original code TODO: multiple translation
        const transContent: string[][] | undefined = _.get(languageHeader, ["content", 0, "lyricContent"], undefined);
        if (transContent) {
            for (let i = 0; i < lines.length; i++) {
                const item = transContent[i];
                if (item.length === 0) continue;
                const str = item.join(" ");
                lines[i].attachments.setTranslation(str);
            }
            this.metadata.attachmentTags.add(TRANSLATION);
        }

        if (lines.length === 0) {
            throw new Error("Lyrics are empty");
        }

        this.lines = lines;
    }
}

export class KugouProvider extends LyricsProvider<KugouResultItem> {
    static source = LyricsProviderSource.kugou;

    public async searchLyrics(request: LyricsSearchRequest): Promise<KugouResultItem[]> {
        try {
            const parameter = {
                keyword: request.searchTerm.toString(),
                duration: Math.floor(request.duration * 1000),
                client: "pc",
                ver: 1,
                man: "yes"
            };
            const response = await axios.get<KugouResponseSearchResult>(SEARCH_URL, { params: parameter });
            if (response.status !== 200) {
                console.error(response.data);
                return [];
            }
            const data = response.data;
            return data.candidates;
        } catch (e) {
            console.error(e);
            return [];
        }
    }
    public async fetchLyrics(token: KugouResultItem): Promise<Lyrics | undefined> {
        try {
            const parameters = {
                id: token.id,
                accesskey: token.accesskey,
                fmt: "krc",
                charset: "utf8",
                client: "pc",
                ver: 1
            };
            const response = await axios.get<KugouResponseSingleLyrics>(LYRICS_URL, {
                params: parameters,
            });
            if (response.status !== 200) {
                console.error(response.data);
                return undefined;
            }
            const data = response.data;
            const lrcContent = decryptKrc(data.content);
            if (!lrcContent) {
                throw new Error("lyric is empty");
            }
            const lrc = new KugouKRCLyrics(lrcContent);

            lrc.idTags[TITLE] = token.song;
            lrc.idTags[ARTIST] = token.singer;
            lrc.idTags[LRC_BY] = "Kugou";

            lrc.length = token.duration / 1000;
            lrc.metadata.source = LyricsProviderSource.kugou;
            lrc.metadata.providerToken = `${token.id},${token.accesskey}`;
            return lrc;
        } catch (e) {
            console.error(e);
            return undefined;
        }
    }
}