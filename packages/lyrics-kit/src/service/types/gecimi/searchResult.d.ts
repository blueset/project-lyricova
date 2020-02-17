interface GecimiResultEntry {
    /** URL to lyrics content. */
    lrc: string;
    aid: number;
}
interface GecimiResponseSearchResult {
    result: GecimiResultEntry[];
}