import type { LyricsSearchRequest } from "../lyricsSearchRequest";
import type { Lyrics } from "../../core/lyrics";

export interface LyricsProviderConstructor<T> {
  new (): LyricsProvider<T>;
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
    const lyrics = await Promise.all(
      results.map((token) =>
        this.fetchLyrics(token).catch((): Lyrics | undefined => undefined),
      ),
    );
    const definedLyrics = lyrics.filter((v): v is Lyrics => v !== undefined);
    definedLyrics.forEach((v) => {
      v.metadata.request = request;
    });
    return definedLyrics;
  }
}
