export interface NetEaseLyrics {
    lyric?: string;
}

export interface NetEaseResponseSingleLyrics {
    lrc?: NetEaseLyrics;
    klyric?: NetEaseLyrics;
    tlyric?: NetEaseLyrics;
    lyricUser?: {
        nickname: string;
    };
}