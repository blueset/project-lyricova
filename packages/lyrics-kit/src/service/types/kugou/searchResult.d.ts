interface KugouResultItem {
    id: string;
    accesskey: string;
    song: string;
    singer: string;
    /** Duration in milliseconds */
    duration: number;
}

interface KugouResponseSearchResult {
    candidates: KugouResultItem[];
}