import { LyricsSearchRequest } from "../lyricsSearchRequest";
import { Lyrics } from "../../core/lyrics";

export interface LyricsProvider {
    constructor();

    getLyrics(request: LyricsSearchRequest): Promise<Lyrics[]>;

    // I had no idea what the publishers are doing here.
    // Just assuming that they are simply requests that return
    // values asynchronously.
}