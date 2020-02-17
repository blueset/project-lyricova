import { LyricsProvider } from ".";
import { LyricsSearchRequest } from "../lyricsSearchRequest";
import { Lyrics } from "../../core/lyrics";
import axios from "axios";
import cheerio from "cheerio";

import { LyricsProviderSource } from "../lyricsProviderSource";
import stringMD5 from "../../utils/stringMD5";

const SEARCH_URL = "http://search.crintsoft.com/searchlyrics.htm";
const LYRICS_URL = "http://viewlyrics.com/";

export class ViewLyricsProvider extends LyricsProvider<ViewLyricsResponseSearchResult> {
    static source = LyricsProviderSource.viewLyrics;

    private static assembleQuery(artist: string, title: string, page: number = 0): Buffer {
        const
            watermark = "Mlv1clt4.0",
            queryForm = `<?xml version='1.0' encoding='utf-8'?><searchV1 artist='${artist}' title='${title}' OnlyMatched='1' client='MiniLyrics' RequestPage='${page}'/>`,
            queryHash = stringMD5(queryForm + watermark),
            header = Buffer.from([2, 0, 4, 0, 0, 0]);
        return Buffer.concat([header, queryHash, Buffer.from(queryForm, "utf8")]);
    }

    public async searchLyrics(request: LyricsSearchRequest): Promise<ViewLyricsResponseSearchResult[]> {
        if (request.searchTerm.state !== "info") {
            console.error("ViewLyrics cannot search by keyword.");
            return [];
        }
        try {
            const { title, artist } = request.searchTerm;
            const data = ViewLyricsProvider.assembleQuery(artist, title);

            const response = await axios.post<string>(SEARCH_URL, data, {
                responseType: "arraybuffer",
                transformResponse: [(resp: ArrayBuffer) => {
                    if (resp.byteLength <= 22) {
                        throw new Error("Data is incomplete");
                    }
                    const buffer = Buffer.from(resp);
                    const magic = buffer[1];
                    const data = buffer.slice(22);
                    for (let i = 0; i < data.length; i++) {
                        data[i] = data[i] ^ magic;
                    }
                    return data.toString();
                }]
            });
            if (response.status !== 200) {
                console.error(response.data);
                return [];
            }
            const data = response.data;

            const $ = cheerio.load(data);
            const results: CheerioElement[] = $("fileinfo").get();
            const lyrics: ViewLyricsResponseSearchResult[] = [];
            
            for (const elm of results) {
                const
                    link = elm.attribs.link,
                    artist = elm.attribs.artist,
                    title = elm.attribs.title,
                    album = elm.attribs.album;
                if (!link || !artist || !title || !album) continue;
                const uploader = elm.attribs.uploader;
                const timeLengthVal = elm.attribs.timelength;
                const timeLength = timeLengthVal === undefined || timeLengthVal === "65535" ? undefined : parseInt(timeLengthVal);
                const
                    rate = parseFloat(elm.attribs.rate),
                    rateCount = parseInt(elm.attribs.ratecount),
                    downloads = parseInt(elm.attribs.downloads);
                lyrics.push({
                    link: link, artist: artist, title: title, album: album,
                    uploader: uploader, timelength: timeLength, rate: rate, ratecount: rateCount, downloads: downloads
                });
            }

            return lyrics;
        } catch (e) {
            console.error(e);
            return [];
        }
    }
    public async fetchLyrics(token: ViewLyricsResponseSearchResult): Promise<Lyrics | undefined> {
        try {
            const url = LYRICS_URL + token.link;
            const response = await axios.get<string>();
            if (response.status !== 200) {
                console.error(response.data);
                return undefined;
            }
            const lrcContent = response.data;
            if (!lrcContent) {
                throw new Error("lyric is empty");
            }
            const lrc = new Lyrics(lrcContent);
            lrc.metadata.source = LyricsProviderSource.viewLyrics;
            lrc.metadata.remoteURL = url;
            if (token.timelength) {
                lrc.length = token.timelength;
            }
            return lrc;
        } catch (e) {
            console.error(e);
            return undefined;
        }
    }
}