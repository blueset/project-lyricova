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

class SearchTermKeyword implements SearchTermKeywordInterface {
    public state: "keyword" = "keyword";
    public keyword: string;

    constructor(keyword: string) {
        this.keyword = keyword;
    }

    public toString() {
        return this.keyword;
    }
}

class SearchTermInfo implements SearchTermInfoInterface {
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
    public searchTerm: LyricsSearchTerm;
    public title: string;
    public artist: string;
    /** duration (in seconds) */
    public duration: number;
    public limit: number;
    /** timeout (in seconds) */
    public timeout: number;
}