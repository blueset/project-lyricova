interface NetEaseLyrics {
    lyric?: string;
}

interface NetEaseResponseSingleLyrics {
    lrc?: NetEaseLyrics;
    klyric?: NetEaseLyrics;
    tlyric?: NetEaseLyrics;
    lyricUser?: {
        nickname: string;
    };
}