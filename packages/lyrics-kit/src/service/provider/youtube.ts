import axios from "axios";
import cheerio from "cheerio";
import { LyricsProvider } from ".";
import { ARTIST, TITLE } from "../../core/idTagKey";
import { Lyrics } from "../../core/lyrics";
import { LyricsLine } from "../../core/lyricsLine";
import { LyricsSearchRequest } from "../lyricsSearchRequest";
import { YouTubeSearchResult } from "../types/youtube/searchResult";
import { YouTubeLyricsJSON3 } from "../types/youtube/singleLyrics";

const BASE_SEARCH_URL = "https://www.youtube.com/results";

class YouTubeLyrics extends Lyrics {
    constructor(data: YouTubeLyricsJSON3) {
        super();
    
        const { events } = data;
    
        const lyricsLines: LyricsLine[] = [];

        for (let i = 0; i < events.length; i++) {
            let addBlankLine = false;
            if (i === events.length - 1) {
                addBlankLine = true;
            } else if (Math.abs(events[i].tStartMs + events[i].tDurationMs - events[i + 1].tStartMs) > 1000) {
                addBlankLine = true;
            }
            
            const start = events[i].tStartMs / 1000;
            const end = (events[i].tStartMs + events[i].tDurationMs) / 1000;
            const lineContent = events[i].segs.map(seg => seg.utf8).join(" ");

            const line = new LyricsLine(lineContent, start);
            line.lyrics = this;
            lyricsLines.push(line);

            if (addBlankLine) {
                const blankLine = new LyricsLine("", end);
                blankLine.lyrics = this;
                lyricsLines.push(blankLine);
            }
        }
    
        this.lines = lyricsLines;
    }
}

export class YouTubeProvider extends LyricsProvider<YouTubeSearchResult> {
    async getTimedTextUrls(id: string): Promise<{ language: string; url: string; }[]> {
        const res = await axios.get(`https://www.youtube.com/watch?v=${id}`);
        const $ = cheerio.load(res.data);
        const dataTag = $("script").filter((_, el) => $(el).html().startsWith("var ytInitialPlayerResponse = ")).first().html();
        const dataJSON = dataTag.substring("var ytInitialPlayerResponse = ".length, dataTag.length - 1);
        const data = JSON.parse(dataJSON);
        const timedTextTracks = data.captions.playerCaptionsTracklistRenderer.captionTracks;
        return timedTextTracks.map(track => ({
            language: track.languageCode,
            url: track.baseUrl
        }));
    }

    public async searchLyrics(request: LyricsSearchRequest): Promise<YouTubeSearchResult[]> {
        const query = {
            search_query: `${request.title} ${request.artist}`,
            sp: "EgIoAQ%3D%3D"
        };

        const res = await axios.get(BASE_SEARCH_URL, {
            params: query
        });

        const $ = cheerio.load(res.data);
        const dataTag = $("script").filter((_, el) => $(el).html().startsWith("var ytInitialData = ")).first().html();
        const dataJSON = dataTag.substring("var ytInitialData = ".length, dataTag.length - 1);
        const data = JSON.parse(dataJSON);

        if (data.alerts && !data.contents) {
            const error = data.alerts.find(a => a.alertRenderer && a.alertRenderer.type === "ERROR");
            if (error) throw new Error(`API error: ${JSON.stringify(error)}`);
        }

        const renderers = data.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents;
        const itemSection = renderers.find(r => r.itemSectionRenderer).itemSectionRenderer.contents;
        const items = itemSection.filter(r => r.videoRenderer).map(r => r.videoRenderer);
        
        const searchResults: YouTubeSearchResult[] = [];
        for (const item of items.slice(0, 5)) {
            const base = {
                id: item.videoId,
                title: item.title.runs[0].text,
                thumbnail: item.thumbnail.thumbnails[0].url,
                uploader: item.ownerText.runs[0].text,
                durationText: item.lengthText?.simpleText ?? "",
            };
            for (const language of await this.getTimedTextUrls(base.id)) {
                searchResults.push({
                    ...base,
                    title: `${base.title} (${language.language})`,
                    language: language.language,
                    url: language.url + "&fmt=json3",
                });
            }
        }

        return searchResults;
    }

    static parseDuration(durationText: string): number {
        const parts = durationText.split(":").reverse();
        let duration = 0;
        for (let i = 0; i < parts.length; i++) {
            duration += parseInt(parts[i]) * Math.pow(60, i);
        }
        return duration;
    }

    public async fetchLyrics(token: YouTubeSearchResult): Promise<Lyrics> {
        const data = await axios.get<YouTubeLyricsJSON3>(token.url);
        const lyrics = new YouTubeLyrics(data.data);
        lyrics.idTags[TITLE] = token.title;
        lyrics.idTags[ARTIST] = token.uploader;
        lyrics.metadata.providerToken = `${token.id} ${token.language}`;
        lyrics.metadata.artworkURL = token.thumbnail;
        lyrics.length = YouTubeProvider.parseDuration(token.durationText);
        return lyrics;
    }
}