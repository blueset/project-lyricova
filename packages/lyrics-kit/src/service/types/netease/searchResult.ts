export interface NetEaseResponseSong {
    name: string;
    id: number;
    /** duration (in millisecond) */
    duration: number;
    artists: {
        name: string;
        id: number;
    }[];
    album: {
        name: string;
        id: number;
        picUrl: string;
    };
}

export interface NetEaseResponseSearchResult {
    result: {
        songCount: number;
        songs: NetEaseResponseSong[];
    };
    code: number;
}