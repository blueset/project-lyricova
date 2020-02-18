/* eslint-disable @typescript-eslint/camelcase */
//
//  marumaru.ts
//
//  This file is part of lyrics-kit
//  Copyright (C) 2020 Eana Hufwe. Licensed under GPLv3.
//

import { LyricsProvider } from ".";
import { LyricsSearchRequest } from "../lyricsSearchRequest";
import { Lyrics } from "../../core/lyrics";
import axios from "axios";
import cheerio from "cheerio";
import { URL } from "url";
import { stringify } from "querystring";

import { LyricsProviderSource } from "../lyricsProviderSource";
import { TITLE, ARTIST } from "../../core/idTagKey";
import { Range, AttachmentsContent, FURIGANA, RangeAttribute, TRANSLATION, PlainText, Attachments } from "../../core/lyricsLineAttachment";
import { LyricsLine } from "../../core/lyricsLine";
import { MarumaruResponseSingleLyrics } from "../types/marumaru/singleLyrics";
import { MarumaruEntry } from "../types/marumaru/searchResult";

const SEARCH_URL = "https://www.jpmarumaru.com/tw/JPSongList.asp";
const LYRICS_URL = "https://www.jpmarumaru.com/tw/api/json_JPSongTrack.asp";

class MarumaruLyrics extends Lyrics {
    /** Parse time tag in format of hh:mm:ss.mmm into number of seconds. */
    static parseTimeTag(timeTag: string): number {
        try {
        const [h, m, s] = timeTag.match(/^(\d+):(\d+):([\d.]+)$/);
        return parseFloat(h) * 60 * 60 +
               parseFloat(m) * 60 +
               parseFloat(s);
        } catch {
            console.error(`${timeTag} is not a valid time tag.`);
            return 0;
        }
    }

    constructor(data: MarumaruResponseSingleLyrics) {
        super();

        const { Lyrics, LyricsYomi, Translate_zh, StartTime, EndTime } = data;

        const numberOfLinesCandidates = [
            Lyrics.length,
            LyricsYomi.length,
            Translate_zh.length,
            StartTime.length,
            EndTime.length
        ].filter(v => v > 0);
        if (numberOfLinesCandidates.length === 0) {
            throw new Error("Lyrics is empty.");
        }
        const numberOfLines = Math.min(...numberOfLinesCandidates);

        const lines = [];

        for (let i = 0; i < numberOfLines; i++) {
            let addBlankLine = false;
            if (i === numberOfLines - 1) {
                addBlankLine = true;
            } else if (EndTime[i] !== StartTime[i + 1]) {
                addBlankLine = true;
            }
            const 
                start = MarumaruLyrics.parseTimeTag(StartTime[i]),
                end = MarumaruLyrics.parseTimeTag(EndTime[i]);
            let lineContent = "";

            const attachments: AttachmentsContent = {};
            if (LyricsYomi[i]) {
                const furigana: [string, Range][] = [];
                const $ = cheerio;
                const segments: CheerioElement[] = $(LyricsYomi[i]).map(x => x).get();
                for (const segment of segments) {
                    if (segment.type === "tag") {
                        const 
                            segmentText = $("rb", segment).text(),
                            segmentRuby = $("rt", segment).text();
                        furigana.push([segmentRuby, [lineContent.length, lineContent.length + segmentText.length]]);
                        lineContent += segmentText;
                    } else if (segment.type === "text") {
                        lineContent += segment.data;
                    }
                }
                if (furigana.length > 0) {
                    attachments[FURIGANA] = new RangeAttribute(furigana);
                    this.metadata.attachmentTags.add(FURIGANA);
                }
            } else {
                lineContent = Lyrics[i];
            }
            if (Translate_zh[i]) {
                attachments[TRANSLATION] = new PlainText(Translate_zh[i]);
                this.metadata.attachmentTags.add(TRANSLATION);
            }
            const att = new Attachments(attachments);
            const line = new LyricsLine(lineContent, start, att);
            line.lyrics = this;
            lines.push(line);

            if (addBlankLine) {
                const blankLine = new LyricsLine("", end);
                blankLine.lyrics = this;
                lines.push(blankLine);
            }
        }

        if (lines.length === 0) {
            throw new Error("Lyrics is empty.");
        }

        this.lines = lines;
    }
}

export class MarumaruProvider extends LyricsProvider<MarumaruEntry> {
    // static source = LyricsProviderSource.marumaru;

    public async searchLyrics(request: LyricsSearchRequest): Promise<MarumaruEntry[]> {
        try {
            let keyword = "";
            if (request.searchTerm.state === "info") {
                keyword = request.searchTerm.title;
            } else if (request.searchTerm.state === "keyword") {
                keyword = request.searchTerm.keyword;
            }
            const parameters = {
                keyword: keyword,
                KW: keyword,
                SongType: "",
                Singer: "",
                FormatType: "",
                AvgScore: "",
                OrderBy: "",
                MySong: "",
                Page: 1
            };

            const response = await axios.post<string>(
                SEARCH_URL, 
                stringify(parameters),
                {
                    headers: { 
                        Accept: "*/*",
                        "Content-Type": "application/x-www-form-urlencoded; charset=utf-8"
                    }
                }
            );
            if (response.status !== 200) {
                console.error(response.data);
                return [];
            }
            const data: string = response.data;
            const $ = cheerio.load(data);
            return $("table.song-list").map((_, elm) => { 
                const href = $("a", elm).attr("href");
                const songPK = href.match(/\d+/g)[0];
                const title = $("a > span[lang=ja]", elm).text();
                const artist = $("td > span[lang=ja]", elm).text().replace(/^ - /g, "");
                const coverRaw = $("img", elm).attr("src");
                const cover = new URL(coverRaw, SEARCH_URL).href;
                return {
                    songPK: songPK,
                    title: title,
                    artist: artist,
                    cover: cover
                };
            }).get() as MarumaruEntry[];
        } catch (e) {
            console.error(e);
            return [];
        }
    }
    public async fetchLyrics(token: MarumaruEntry): Promise<Lyrics | undefined> {
        try {
            const url = LYRICS_URL;
            const response = await axios.post<MarumaruResponseSingleLyrics>(
                url, 
                `SongPK=${token.songPK}`, 
                { headers: { Referer: `https://www.jpmarumaru.com/tw/JPSongPlay-${token.songPK}.html` } }
            );
            if (response.status !== 200) {
                console.error(response.data);
                return undefined;
            }
            const content = response.data;
            if (!content) {
                throw new Error("lyric is empty");
            }
            const lrc = new MarumaruLyrics(content);
            lrc.idTags[TITLE] = token.title;
            lrc.idTags[ARTIST] = token.artist;
            lrc.metadata.providerToken = `${token.songPK}`;
            lrc.metadata.source = LyricsProviderSource.marumaru;
            lrc.metadata.artworkURL = token.cover;
            return lrc;
        } catch (e) {
            console.error(e);
            return undefined;
        }
    }
}