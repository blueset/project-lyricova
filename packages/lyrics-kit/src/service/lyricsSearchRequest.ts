interface SearchTermKeywordInterface {
    state: "keyword";
    keyword: string;
    toString: () => string;
};
interface SearchTermInfoInterface {
    state: "info";
    title: string;
    artist: string;
    toString: () => string;
};
export type LyricsSearchTerm = SearchTermKeywordInterface | SearchTermInfoInterface;

export class SearchTermKeyword implements SearchTermKeywordInterface {
    public state: "keyword" = "keyword";
    public keyword: string;

    constructor(keyword: string) {
        this.keyword = keyword;
    }

    public toString() {
        return this.keyword;
    }
}

export class SearchTermInfo implements SearchTermInfoInterface {
    public state: "info" = "info";
    public title: string;
    public artist: string;

    constructor(title: string, artist: string) {
        this.title = title;
        this.artist = artist;
    }

    public toString() {
        return `${this.title} ${this.artist}`;
    }
}

export class LyricsSearchRequest {
    searchTerm: LyricsSearchTerm;
    title: string;
    artist: string;
    /** duration (in seconds) */
    duration: number;
    limit: number;
    /** timeout (in seconds) */
    timeout: number;

    constructor(searchTerm: LyricsSearchTerm, title: string, artist: string, duration: number, limit: number = 6, timeout: number = 30) {
        this.searchTerm = searchTerm;
        this.title = title;
        this.artist = artist;
        this.duration = duration;
        this.limit = limit;
        this.timeout = timeout;
    }

    public static fromKeyword(keyword: string, title: string, artist: string, duration: number, limit?: number, timeout?: number) {
        return new LyricsSearchRequest(
            new SearchTermKeyword(keyword),
            title, artist, duration, limit, timeout
        );
    }
    public static fromInfo(title: string, artist: string, duration: number, limit?: number, timeout?: number) {
        return new LyricsSearchRequest(
            new SearchTermInfo(title, artist),
            title, artist, duration, limit, timeout
        );
    }
}