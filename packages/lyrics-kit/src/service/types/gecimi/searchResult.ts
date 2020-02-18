export interface GecimiResultEntry {
    /** URL to lyrics content. */
    lrc: string;
    aid: number;
}
export interface GecimiResponseSearchResult {
    result: GecimiResultEntry[];
}