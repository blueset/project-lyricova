import { LyricsProvider } from ".";
import { LyricsSearchRequest } from "../lyricsSearchRequest";
import { Lyrics } from "../../core/lyrics";
import axios from "axios";
import cheerio from "cheerio";

import { LyricsProviderSource } from "../lyricsProviderSource";
import { SyairResponseSearchResult } from "../types/syair/searchResult";
import { TITLE } from "../../core/idTagKey";

const SEARCH_URL = "https://syair.info/search";
const LYRICS_URL = "https://syair.info/";

export class SyairProvider extends LyricsProvider<SyairResponseSearchResult> {
    // static source = LyricsProviderSource.syair;

    public async searchLyrics(request: LyricsSearchRequest): Promise<SyairResponseSearchResult[]> {
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
            const $ = cheerio.load(data);
            return $(".li > a").map((_, x: CheerioElement): SyairResponseSearchResult => { 
                return { url: $(x).attr("href"), name: $(x).text() }; 
            }).get();
        } catch (e) {
            console.error(e);
            return [];
        }
    }
    public async fetchLyrics(token: SyairResponseSearchResult): Promise<Lyrics | undefined> {
        try {
            const response = await axios.get<string>(token.url, {
                baseURL: LYRICS_URL,
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
            const $ = cheerio.load(content);
            const downloadLink = $("a[href*=download]").attr("href");
            let lyricsText = "";
            
            const lyricsRequest = await axios.get(downloadLink, {
                baseURL: LYRICS_URL,
                headers: {
                    "Cookie": response.headers["set-cookie"][0].split(";")[0]
                }
            });
            if (lyricsRequest.data !== "This URL is invalid or has expired.") {
                lyricsText = lyricsRequest.data;
            }
            if (!lyricsText) {
                lyricsText = cheerio.load(response.data)(".entry").text();
            }
            lyricsText = lyricsText.replace(/\r\n/g, "\n");
            const lrc = new Lyrics(lyricsText);
            lrc.idTags[TITLE] = lrc.idTags[TITLE] || token.name;
            lrc.metadata.source = LyricsProviderSource.syair;
            lrc.metadata.providerToken = token.url;
            return lrc;
        } catch (e) {
            console.error(e);
            return undefined;
        }
    }
}