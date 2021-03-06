export interface XiamiResultSong {
    song_name: string;
    artist_name: string;
    album_logo?: string;
    lyric?: string;
}

export interface XiamiResponseSearchResult {
    data: {
        songs: XiamiResultSong[];
    };
}