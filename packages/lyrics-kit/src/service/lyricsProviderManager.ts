import { LyricsProviderSource } from "./lyricsProviderSource";
import type { LyricsSearchRequest } from "./lyricsSearchRequest";
import type { Lyrics } from "../core/lyrics";
import type { LyricsProvider } from "./provider";
import _ from "lodash";

export class LyricsProviderManager {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public providers: LyricsProvider<any>[];

  constructor(
    sources: LyricsProviderSource<any>[] = LyricsProviderSource.allCases,
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
