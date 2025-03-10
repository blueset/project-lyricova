export interface LrcLibSearchResult {
    id: number;
    name: string;
    trackName: string;
    artistName: string;
    albumName?: string;
    duration?: number;
    instrumental: boolean;
    syncedLyrics?: string;
}