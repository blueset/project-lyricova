export interface MusixMatchSyncLyricsLine {
    text: string;
    time: {
        total: number;
        minutes: number;
        seconds: number;
        hundredth: number;
    }
}