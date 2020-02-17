import { LyricsProviderSource } from "./lyricsProviderSource";
import { LyricsSearchRequest } from "./lyricsSearchRequest";
import { Lyrics } from "../core/lyrics";
import { LyricsProvider } from "./provider";
import _ from "lodash";

export class LyricsProviderManager {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public providers: LyricsProvider<any>[];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(sources: LyricsProviderSource<any>[] = LyricsProviderSource.allCases) {
        this.providers = sources.map(v => v.build());
    }

    public async getLyrics(request: LyricsSearchRequest): Promise<Lyrics[]> {
        const result = await Promise.all(this.providers.map(v => v.getLyrics(request)));
        return _.flatten(result);
    }
}