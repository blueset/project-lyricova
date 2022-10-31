import axios from "axios";
import { LyricsProvider } from ".";
import { ARTIST, TITLE } from "../../core/idTagKey";
import { Lyrics } from "../../core/lyrics";
import { LyricsLine } from "../../core/lyricsLine";
import { LyricsProviderSource } from "../lyricsProviderSource";
import { LyricsSearchRequest } from "../lyricsSearchRequest";
import { MusixMatchEntry } from "../types/lyrixmatch/searchResult";
import { MusixMatchSyncLyricsLine } from "../types/lyrixmatch/singleLyrics";

/* Token from: https://github.com/logan-mcgee/DiscordLyrics/blob/master/config.json */
const token = {
    "usertoken": "191231a5ea353397cca5b11ab22048db1f50f515a99e174078b148",
    "signature": "d9UI+QhfKS2hrs2BbiIKkBZykgs=",
    "Cookie": "AWSELB=55578B011601B1EF8BC274C33F9043CA947F99DCFF6AB1B746DBF1E96A6F2B997493EE03F246465F0C13E5B1F720DBC6D3E3802C92E4E48F6DE4DEB9C95CF2A68340C40430"
};

class MusixMatchLyrics extends Lyrics {
    constructor(data: MusixMatchEntry) {
        super();
        const lyrics = data.message.body.macro_calls["track.subtitles.get"].message.body.subtitle_list;
        const trackInfo = data.message.body.macro_calls["matcher.track.get"].message.body.track;
        const lyricsJSON = lyrics[0].subtitle.subtitle_body;
        const lyricsData: MusixMatchSyncLyricsLine[] = JSON.parse(lyricsJSON);
        this.idTags[TITLE] = trackInfo.track_name;
        this.idTags[ARTIST] = trackInfo.artist_name;
        this.metadata.artworkURL = trackInfo.album_coverart_100x100;
        this.metadata.providerToken = `${trackInfo.track_id}`;
        this.metadata.source = LyricsProviderSource.musixmatch;
        this.length = trackInfo.track_length;
        this.lines = lyricsData.map(line => {
            const lline = new LyricsLine(line.text, line.time.total);
            lline.lyrics = this;
            return lline;
        });
    }
}

export class MusixMatchProvider extends LyricsProvider<MusixMatchEntry> {
    public async searchLyrics(request: LyricsSearchRequest): Promise<MusixMatchEntry[]> {
        const query = {
            "format": "json",
            "q_track": request.title,
            "q_artist": request.artist,
            "user_language": "en",
            "q_duration": request.duration,
            "tags": "nowplaying",
            "namespace": "lyrics_synched",
            "part": "lyrics_crowd,user,lyrics_verified_by",
            "f_subtitle_length_max_deviation": "1",
            "subtitle_format": "mxm",
            "usertoken": token.usertoken,
            "signature": token.signature,
            "signature_protocol": "sha1",
            "app_id": "web-desktop-app-v1.0"
        };

        const lyrres = await axios.get<MusixMatchEntry>("https://apic-desktop.musixmatch.com/ws/1.1/macro.subtitles.get",
        {
            params: query,
            headers: {
                Cookie: token.Cookie
            }
        });

        if (lyrres.status !== 200) {
            console.error(lyrres.data);
            return [];
        }

        return [lyrres.data];
    }

    public async fetchLyrics(token: MusixMatchEntry): Promise<Lyrics | undefined> {
        const subtitles = token?.message?.body?.macro_calls?.["track.subtitles.get"] ?? undefined;
        if (!subtitles) {
            // Data not exist
            return undefined;
        }
        if (subtitles?.message?.header?.status_code !== 200 || (subtitles?.message?.body?.subtitle_list?.length ?? 0) === 0) {
            // No lyrics found
            return undefined;
        }
        return new MusixMatchLyrics(token);
    }
}