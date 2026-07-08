import { LyricsProviderSource } from "./lyricsProviderSource.js";
import type { LyricsSearchRequest } from "./lyricsSearchRequest.js";
import type { Lyrics } from "../core/lyrics.js";
import type { LyricsProvider } from "./provider/index.js";
import _ from "lodash";

export class LyricsProviderManager {
  public providers: LyricsProvider<unknown>[];

  constructor(
    sources: LyricsProviderSource<LyricsProvider<unknown>>[] = LyricsProviderSource.allCases,
  ) {
    this.providers = sources.map((v) => v.build());
  }

  public async getLyrics(request: LyricsSearchRequest): Promise<Lyrics[]> {
    const result = await Promise.all(
      this.providers.map((v) => v.getLyrics(request)),
    );
    return _.flatten(result);
  }
}
