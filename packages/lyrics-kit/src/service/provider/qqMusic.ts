import { LyricsProvider } from ".";
import { LyricsSearchRequest } from "../lyricsSearchRequest";
import { Lyrics } from "../../core/lyrics";
import axios from "axios";
import axiosJsonp from "../../utils/axiosJsonp";
import _ from "lodash";
import { TITLE, ARTIST, ALBUM } from "../../core/idTagKey";
import { LyricsProviderSource } from "../lyricsProviderSource";
import { QQSongItem, QQResponseSearchResult } from "../types/qqMusic/searchResult";
import { QQResponseSingleLyrics } from "../types/qqMusic/singleLyrics";

const SEARCH_URL = "https://c.y.qq.com/soso/fcgi-bin/client_search_cp";
const LYRICS_URL = "https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg";

function decodeLyrics(base64: string): string {
    return _.unescape(Buffer.from(base64, "base64").toString());
}

export class QQMusicProvider extends LyricsProvider<QQSongItem> {
    // static source = LyricsProviderSource.qq;

    public async searchLyrics(request: LyricsSearchRequest): Promise<QQSongItem[]> {
        try {
            const parameter = {
                w: request.searchTerm.toString()
            };
            const response = await axios.get<QQResponseSearchResult>(SEARCH_URL,
                _.defaults({ params: parameter }, axiosJsonp));
            if (response.status !== 200) {
                console.error(response.data);
                return [];
            }
            const data = response.data;
            return data.data.song.list;
        } catch (e) {
            console.error(e);
            return [];
        }
    }
    public async fetchLyrics(token: QQSongItem): Promise<Lyrics | undefined> {
        try {
            const parameters = {
                songmid: token.songmid,
                // eslint-disable-next-line @typescript-eslint/camelcase
                g_tk: 5381
            };
            const response = await axios.get<QQResponseSingleLyrics>(LYRICS_URL, _.defaults({
                params: parameters,
                headers: {
                    Referer: "y.qq.com/portal/player.html"
                }
            }, axiosJsonp));
            if (response.status !== 200) {
                console.error(response.data);
                return undefined;
            }
            const data = response.data;
            const lrcContent = data.lyric ? decodeLyrics(data.lyric) : null;
            if (!lrcContent) {
                throw new Error("lyric is empty");
            }
            const lrc = new Lyrics(lrcContent);
            const transLrcContent = data.trans ? decodeLyrics(data.trans) : null;
            if (transLrcContent) {
                const transLrc = new Lyrics(transLrcContent);
                lrc.merge(transLrc);
            }

            lrc.idTags[TITLE] = token.songname;
            if (token.singer.length > 0)
                lrc.idTags[ARTIST] = token.singer[0].name;
            lrc.idTags[ALBUM] = token.albumname;
            
            lrc.length = token.interval;
            lrc.metadata.source = LyricsProviderSource.qq;
            lrc.metadata.providerToken = `${token.songmid}`;
            if (token.songmid) {
                const id = parseInt(token.songmid);
                lrc.metadata.artworkURL = `http://imgcache.qq.com/music/photo/album/${id % 100}/${id}.jpg`;
            }
            return lrc;
        } catch (e) {
            console.error(e);
            return undefined;
        }
    }
}