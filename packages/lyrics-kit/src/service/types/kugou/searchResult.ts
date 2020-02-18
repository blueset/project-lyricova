export interface KugouResultItem {
    id: string;
    accesskey: string;
    song: string;
    singer: string;
    /** Duration in milliseconds */
    duration: number;
}

export interface KugouResponseSearchResult {
    candidates: KugouResultItem[];
}