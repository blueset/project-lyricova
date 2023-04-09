export interface QQSongItem {
  title: string;
  id: number;
  mid: string;
  interval: number;
  singer: {
    title: string;
  }[];
  album: {
    title: string;
  };
}

export interface QQResponseSearchResult {
  req_1: {
    data: {
      body: {
        song: {
          list: QQSongItem[];
        };
      };
    };
  };
}
