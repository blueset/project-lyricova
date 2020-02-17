import { LyricsProvider } from ".";
import { LyricsSearchRequest } from "../lyricsSearchRequest";
import { Lyrics } from "../../core/lyrics";
import axios from "axios";
import { TITLE, ARTIST } from "../../core/idTagKey";
import { LyricsProviderSource } from "../lyricsProviderSource";

const SEARCH_URL = "http://api.xiami.com/web";

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