export interface QQSongItem {
    songmid: string;
    songname: string;
    albumname: string;
    interval: number;
    singer: {
        name: string;
    }[];
}

export interface QQResponseSearchResult {
    data: {
        song: {
            list: QQSongItem[];
        };
    };
    code: number;
}