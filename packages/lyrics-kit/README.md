# lyrics-kit

Fetch and parse lyrics from various sources.

This project is ported from [ddddxxx/LyricsKit](https://github.com/ddddxxx/LyricsKit),
licenced under GPL v3.

## Install

```shell
$ # This package is not yet on npm / yarn.
```

## Usage

### Typescript (ES6 import)

```typescript
import {
  LyricsSearchRequest as Request,
  LyricsProviderManager as Manager,
  LyricsProviderSource as Source,
  Lyrics
} from 'lyrics-kit';

async () => {
  const request = Request.fromInfo(
    'Song title',
    'Artist name',
    /* duration in seconds */ 320.1
  );
  // Get lyrics from all sources.
  let manager = new Manager();
  let lyrics: Lyrics[] = manager.getLyrics(request);

  // Get lyrics from a set of sources
  manager = new Manager([Source.netease, Source.kugou]);
  lyrics = manager.getLyrics(request);

  // Get lyrics from a single source
  source = Source.qqMusic.build();
  lyrics = source.getLyrics(request);

  // Get LRCX text
  for (const lyric of lyrics) {
    console.log('========== BEGIN LRCX CONTENT ==========');
    console.log(lyric.toString());
    console.log('=========== END LRCX CONTENT ===========');
  }
};
```

---

## Appendix: LRCX grammar

```grammar
lrcx                    ::= [line (NEWLINE line)*]
line                    ::= id_tag | lyric_line | ""

// ID tags

id_tag                  ::= "[" text_tag_key ":" tag_text "]"
                          | "[length:" fixed_2_number "]"
                          | "[offset:" number "]"
id_tag_key              ::= "ti" | "al" | "ar" | "au" | "by"
tag_text                ::= <all printable characters except NEWLINE, ":" or "]">

// Lyric line

lyric_line              ::= time_tag text [NEWLINE time_tag inline_time_tag] [NEWLINE time_tag translation] [NEWLINE time_tag ruby]
time_tag                ::= ["-"] decimal decimal decimal* ":" decimal decimal ":" decimal decimal decimal
text                    ::= <all printable characters except NEWLINE, "[" or "]">

// Inline time tags

inline_time_tag         ::= inline_time_tag_element inline_time_tag_element* [duration_tag]
inline_time_tag_element ::= "<" non_negative_integer "," non_negative_integer ">"
duration_tag            ::= "<" non_negative_integer ">"

// Translation

translation             ::= "[tr" [ ":" text ] "]" text

// Ruby (furigana / romaji for Japanese)

ruby                    ::= "[" ("fu" | "ro") "]" ruby_tags
ruby_tags               ::= ruby_tag ruby_tag*
ruby_tag                ::= "<" ruby_tag_text "," non_negative_integer "," non_negative_integer ">"
ruby_text_text          ::= <all printable characters except NEWLINE, "<" or ">">

// Numbers

fixed_2_number          ::= decimal decimal* "." decimal decimal
number                  ::= ["-"] integer ["." decimal decimal*]
decimal                 ::= "0".."9"
integer                 ::= negative_integer | zero | positive_integer
negative_integer        ::= "-" positive_integer
zero                    ::= "0"
positive_integer        ::= "1".."9" decimal*
non_negative_integer    ::= zero | positive_integer
```

---

    lyrics-kit: Fetch and parse lyrics from various sources.
    Copyright (C) 2020  Eana Hufwe
    Copyright (C) 2020  ddddxxx

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
