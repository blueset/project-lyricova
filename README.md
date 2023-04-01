# Project Lyricova (歌语计划)

Project Lyricova is a free and open source blogging tool focused on lyrics.

Project Lyricova is currently under the progress of a complete rewrite. The new
program will consist of 2 parts: a jukebox + music library manager and a lyrics
blog. The new tech stack is planned to be TypeScript + Node.js + MySQL +
Express.js + React.

For the current version of Project Lyricova released in 2015, see the `v1`
branch.

## Packages

- `jukebox`: Music library manager and public jukebox.
- `lyricova`: Lyrics blog (similar to version 1).
- `common`: Common code shared between `jukebox` and `lyricova`.
- `lyrics-kit`: Fetch and parse lyrics from various sources.

## Etymology

The name _Lyricova_ is a made up word from “lyrics” and “nova” (taking the
meaning of _new_), which signifies a new way to write blogs. This project was
previously known as _Project Gy_ which is taken from its name in Chinese, Gē-yǔ
(歌語). 歌 means _songs_, and 語 means _to express_, putting together, Gē-yǔ is
making a sense of expressing oneself through songs and lyrics.

## See also

- [Lyricize](https://github.com/outloudvi/lyricize), a lyrics and quote
  collection site written in Django by @outloudvi. Heavily inspired by Project
  Lyricova (v1).
