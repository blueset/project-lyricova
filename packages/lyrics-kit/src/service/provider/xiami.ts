import { LyricsProvider } from ".";
import { LyricsSearchRequest } from "../lyricsSearchRequest";
import { Lyrics } from "../../core/lyrics";
import axios from "axios";
import { TITLE, ARTIST } from "../../core/idTagKey";
import { LyricsProviderSource } from "../lyricsProviderSource";
import { ttpodXtrcLineRegex, id3TagRegex, resolveTimeTag, ttpodXtrcInlineTagRegex } from "../../utils/regexPattern";
import { LyricsLine } from "../../core/lyricsLine";
import { WordTimeTag, WordTimeTagLabel, Attachments, TRANSLATION, TIME_TAG } from "../../core/lyricsLineAttachment";
import _ from "lodash";

const SEARCH_URL = "http://api.xiami.com/web";

class TTPodXtrcLyrics extends Lyrics {
    constructor(content: string) {
        const lineMatches = content.matchAll(ttpodXtrcLineRegex);
        let isPlainLrc = true;
        for (const match of lineMatches) {
            if (match[2] || match[3]) {
                isPlainLrc = false;
                break;
            }
        }
        if (isPlainLrc) {
            super(content);
            return;
        }
        super();

        const matches = content.matchAll(id3TagRegex);
        for (const match in matches) {
            const key = match[1].trim(), value = match[2].trim();
            if (key && value) {
                this.idTags[key] = value;
            }
        }

        const lines = [];
        for (const match of lineMatches) {
            const
                timeTagStr = match[1],
                timeTags = resolveTimeTag(timeTagStr);

            let line: LyricsLine;
            if (match[3]) {
                line = new LyricsLine(match[3], 0);
            } else {
                let lineContent = "";
                const timetagAttachment = new WordTimeTag(
                    [new WordTimeTagLabel(0, 0)]
                );
                let dt = 0.0;
                const inlineTagMatches = match[3].matchAll(ttpodXtrcInlineTagRegex);
                for (const m of inlineTagMatches) {
                    const timeTagStr = m[1];
                    const timeTag = parseFloat(timeTagStr) / 1000;
                    const fragment = m[2];
                    if (!fragment) {
                        continue;
                    }
                    lineContent += fragment;
                    dt += timeTag;
                    timetagAttachment.tags.push(new WordTimeTagLabel(dt, lineContent.length));
                }
                const att = new Attachments({ TIME_TAG: timetagAttachment });
                line = new LyricsLine(lineContent, 0, att);
            }
            
            if (match[4]) {
                line.attachments.setTranslation(match[4]);
                this.metadata.attachmentTags.add(TRANSLATION);
            }
            
            timeTags.forEach(v => {
                const l = _.clone(line);
                l.position = v;
                line.lyrics = this;
                lines.push(line);
            });
        }

        lines.sort((a, b) => a.position - b.position);

        this.metadata.attachmentTags.add(TIME_TAG);

        if (lines.length === 0) {
            throw new Error("Lyrics are empty");
        }

        this.lines = lines;
    }
}

export class XiamiProvider extends LyricsProvider<XiamiResultSong> {
    static source = LyricsProviderSource.qq;

    public async searchLyrics(request: LyricsSearchRequest): Promise<XiamiResultSong[]> {
        try {
            const parameter = {
                key: request.searchTerm.toString(),
                limit: 10,
                r: "search/songs",
                v: "2.0",
                // eslint-disable-next-line @typescript-eslint/camelcase
                app_key: 1
            };
            const response = await axios.post<XiamiResponseSearchResult>(SEARCH_URL,
                { params: parameter, headers: { Referer: "http://h.xiami.com/" } }
            );
            if (response.status !== 200) {
                console.error(response.data);
                return [];
            }
            const data = response.data;
            return data.data.songs;
        } catch (e) {
            console.error(e);
            return [];
        }
    }
    public async fetchLyrics(token: XiamiResultSong): Promise<Lyrics | undefined> {
        try {
            const lrcURL = token.lyric;
            if (!lrcURL) {
                throw new Error("No lyrics found");
            }
            const response = await axios.get<string>(lrcURL);
            if (response.status !== 200) {
                console.error(response.data);
                return undefined;
            }
            const data = response.data;
            const lrc = new TTPodXtrcLyrics(data);

            lrc.idTags[TITLE] = token.song_name;
            lrc.idTags[ARTIST] = token.artist_name;

            lrc.metadata.remoteURL = lrcURL;
            lrc.metadata.source = LyricsProviderSource.xiami;
            lrc.metadata.providerToken = token.lyric;
            lrc.metadata.artworkURL = token.album_logo;
            return lrc;
        } catch (e) {
            console.error(e);
            return undefined;
        }
    }
}