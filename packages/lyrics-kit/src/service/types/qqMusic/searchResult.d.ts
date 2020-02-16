interface QQSongItem {
    songmid: string;
    songname: string;
    albumname: string;
    interval: number;
    singer: {
        name: string;
    }[];
}

interface QQResponseSearchResult {
    data: {
        song: {
            list: QQSongItem[];
        };
    };
    code: number;
}