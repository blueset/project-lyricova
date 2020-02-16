export type LyricsSearchTerm = {
    state: "keyword",
    keyword: string
} | {
    state: "info",
    title: string,
    artist: string
};

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