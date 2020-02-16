import { LyricsSearchRequest } from "../lyricsSearchRequest";
import { Lyrics } from "../../core/lyrics";

export interface LyricsProviderConstructor<T> {
    constructor(): LyricsProvider<T>;
}

export abstract class LyricsProvider<T> {
    
    // I had no idea what the publishers are doing here.
    // Just assuming that they are simply requests that return
    // values asynchronously.

    /**
     * Search for lyrics by terms
     * @param request Request to search for lyrics
     */
    public abstract searchLyrics(request: LyricsSearchRequest): Promise<T[]>;

    /**
     * Fetch search result and produce lyrics
     * @param token Token representing a search result
     */
    public abstract fetchLyrics(token: T): Promise<Lyrics | undefined>;

    public async getLyrics(request: LyricsSearchRequest): Promise<Lyrics[]> {
        const results = (await this.searchLyrics(request)).slice(0, request.limit);
        let lyrics = await Promise.all(results.map(
            token => this.fetchLyrics(token).catch(() => undefined)
        ));
        lyrics = lyrics.filter(v => v !== undefined);
        lyrics.forEach((v) => {v.metadata.request = request});
        return lyrics;
    }
    
}