export interface ViewLyricsResponseSearchResult {
    link: string;
    artist: string;
    title: string;
    album: string;
    uploader?: string;
    timelength?: number;
    rate?: number;
    ratecount?: number;
    downloads?: number;
}