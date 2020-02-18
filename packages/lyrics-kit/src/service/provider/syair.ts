import { LyricsProvider } from ".";
import { LyricsSearchRequest } from "../lyricsSearchRequest";
import { Lyrics } from "../../core/lyrics";
import axios from "axios";

import { LyricsProviderSource } from "../lyricsProviderSource";
import { syairSearchResultRegex, syairLyricsContentRegex } from "../../utils/regexPattern";
import _ from "lodash";

const SEARCH_URL = "https://syair.info/search";
const LYRICS_URL = "https://syair.info/";

export class SyairProvider extends LyricsProvider<string> {
    static source = LyricsProviderSource.syair;

    public async searchLyrics(request: LyricsSearchRequest): Promise<string[]> {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const parameters: any = {
                page: 1
            };
            if (request.searchTerm.state === "info") {
                parameters.artist = request.searchTerm.artist;
                parameters.title = request.searchTerm.title;
            } else if (request.searchTerm.state === "keyword") {
                parameters.q = request.searchTerm.keyword;
            }

            const response = await axios.get<string>(SEARCH_URL, {
                params: parameters
            });
            if (response.status !== 200) {
                console.error(response.data);
                return [];
            }
            const data: string = response.data;

            const matches = data.matchAll(syairSearchResultRegex);
            const lyrics: string[] = [];
            for (const match of matches) {
                if (match[1]) {
                    lyrics.push(match[1]);
                }
            }

            return lyrics;
        } catch (e) {
            console.error(e);
            return [];
        }
    }
    public async fetchLyrics(token: string): Promise<Lyrics | undefined> {
        try {
            const url = LYRICS_URL + token;
            const response = await axios.get<string>(url, {
                headers: { Referer: "https://syair.info" }
            });
            if (response.status !== 200) {
                console.error(response.data);
                return undefined;
            }
            const content = response.data;
            if (!content) {
                throw new Error("lyric is empty");
            }
            const match = syairLyricsContentRegex.exec(content);

            const lrc = new Lyrics(_.unescape(match[1]));
            lrc.metadata.source = LyricsProviderSource.syair;
            lrc.metadata.providerToken = token;
            return lrc;
        } catch (e) {
            console.error(e);
            return undefined;
        }
    }
}