import { LyricsProvider } from ".";
import { LyricsSearchRequest } from "../lyricsSearchRequest";
import { Lyrics } from "../../core/lyrics";
import axios from "axios";

import { LyricsProviderSource } from "../lyricsProviderSource";

const SEARCH_URL = "http://gecimi.com/api/lyric";
// const COVER_URL = "http://gecimi.com/api/cover";
// Not used in code.

export class GecimiProvider extends LyricsProvider<GecimiResultEntry> {
    static source = LyricsProviderSource.gecimi;

    public async searchLyrics(request: LyricsSearchRequest): Promise<GecimiResultEntry[]> {
        if (request.searchTerm.state !== "info") {
            console.error("Gecimi cannot search by keyword.");
            return [];
        }
        try {
            const { title, artist } = request.searchTerm;
            const encodedTitle = encodeURIComponent(title), encodedArtist = encodeURIComponent(artist);

            const url = `${SEARCH_URL}/${encodedTitle}/${encodedArtist}`;

            const response = await axios.get<GecimiResponseSearchResult>(url);
            if (response.status !== 200) {
                console.error(response.data);
                return [];
            }
            const data = response.data;
            return data.result;
        } catch (e) {
            console.error(e);
            return [];
        }
    }
    public async fetchLyrics(token: GecimiResultEntry): Promise<Lyrics | undefined> {
        try {
            const response = await axios.get<string>(token.lrc);
            if (response.status !== 200) {
                console.error(response.data);
                return undefined;
            }
            const lrcContent = response.data;
            if (!lrcContent) {
                throw new Error("lyric is empty");
            }
            const lrc = new Lyrics(lrcContent);
            lrc.metadata.source = LyricsProviderSource.gecimi;
            lrc.metadata.remoteURL = token.lrc;
            lrc.metadata.providerToken = `${token.aid},${token.lrc}`;
            return lrc;
        } catch (e) {
            console.error(e);
            return undefined;
        }
    }
}