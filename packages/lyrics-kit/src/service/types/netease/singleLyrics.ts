export interface NetEaseLyrics {
    lyric?: string;
}

export interface NetEaseResponseSingleLyrics {
    lrc?: NetEaseLyrics;
    klyric?: NetEaseLyrics;
    tlyric?: NetEaseLyrics;
    ytlrc?: NetEaseLyrics;
    yrc?: NetEaseLyrics;
    lyricUser?: {
        nickname: string;
    };
}