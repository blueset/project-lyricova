//
//  singleLyrics.d.ts
//
//  This file is part of lyrics-kit
//  Copyright (C) 2020 Eana Hufwe. Licensed under GPLv3.
//

export interface MarumaruResponseSingleLyrics {
    Name: string;
    Name_Translate_zh: string;
    Singer: string;
    Singer_Translate_zh: string;
    CDCover: string;
    PhotoHeight: string;
    /** Name in HTML ruby tags */
    NameYomi: string;
    /** Artist in HTML ruby tags */
    SingerYomi: string;
    PK: string[];
    /** Lyrics in plain text */
    Lyrics: string[];
    /** Lyrics in HTML ruby tags */
    LyricsYomi: string[];
    /** Translated line in pain text */
    Translate_zh: string[];
    /** Start time of line in hh:mm:ss.mmm */
    StartTime: string[];
    /** End time of line in hh:mm:ss.mmm */
    EndTime: string[];
}