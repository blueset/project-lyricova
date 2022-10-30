interface MusixMatchMacroCall<T> {
    message: {
        header: {
            status_code: number;
        };
        body: T;
    };
}

export interface MusixMatchEntry {
    message: {
        body: {
            macro_calls: {
                "matcher.track.get": MusixMatchMacroCall<{
                    track: {
                        track_id: number;
                        track_name: string;
                        artist_name: string;
                        album_name: string;
                        album_coverart_100x100: string;
                    }
                }>;
                "track.subtitles.get": MusixMatchMacroCall<{
                    subtitle_list: {
                        subtitle: {
                            subtitle_body: string;
                        }
                    }[];
                }>;
            };
        };
    };
}