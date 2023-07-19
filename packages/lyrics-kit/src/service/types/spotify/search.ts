export interface SpotifySearchResponse {
  data: {
    searchV2: {
      tracksV2: {
        items: SpotifySearchResult[];
      };
    };
  };
}

export interface SpotifySearchResult {
  matchedFields: ("NAME" | "LYRICS")[];
  item: {
    data: {
      __typename: "Track";
      id: string;
      name: string;
      albumOfTrack: {
        name: string;
        coverArt: {
          sources: {
            url: string;
            width: number;
            height: number;
          }[];
        };
        id: string;
      };
      artists: {
        items: {
          uri: string;
          profile: {
            name: string;
          };
        }[];
      };
      duration: {
        totalMilliseconds: number;
      };
    };
  };
}
