# Project Lyricova

![Project Lyricova](./banner.svg)

Project Lyricova is a free and open source suite of web apps for lyrics blogging
and music management focused on Vocaloid\* contents.

Project Lyricova is currently under the progress of a complete rewrite. The
rewrite will consist of 2 parts: a jukebox + music library manager and a lyrics
blog. The new tech stack is TypeScript + Node.js + MySQL + Express.js + React +
Next.js.

For music manangement, this project relies on [VocaDB](https://vocadb.net) for
its database of Vocaloid songs, and allow manual addition of entries that does
not fall under VocaDB’s scope.

For the previous version of Project Lyricova last released in 2015, see the `v1`
branch.

[Learn more](https://1a23.com/works/open-source/project-lyricova-gen-2/).

<small>\* The term “Vocaloid” here includes all voice synthesizers, as defined
in VocaDB.net.</small>

## Packages

- `jukebox`: Music library manager and public jukebox.
- `lyricova`: Lyrics blog (similar to version 1).
- `common`: Common code shared between `jukebox` and `lyricova`.
- `lyrics-kit`: Fetch and parse lyrics from various sources.

## Install

- Database

  - Setup a MySQL database and import the schema from `lyricova-schema.sql`.
  - Create a MySQL user and grant it access to the database.
  - Create a Lyricova user in the database as admin. Put password in the format
    of a [bcrypt hash](https://en.wikipedia.org/wiki/Bcrypt).

    ```sql
    INSERT INTO Users
      (id, username, displayName, password, email, role, provider, provider_id, creationDate, updatedOn, deletionDate)
    VALUES
      (1, 'admin', 'Administrator', '$2a$10$anT02XU53WKpNV3p30nA2.EZ19ucaWys0MRhMjsCGcIYhdeKyJnfe', 'admin@example.com', 'admin', NULL, NULL, '1970-01-01 00:00:00', '1970-01-01 00:00:00', NULL);
    ```

- Music file storage
  - Create a directory for storing music files (defaulted to
    `/var/lyricova/music`).
- Environment variables
  - Configure the environment variables in `.env` file. Refer to `.env.sample`
    for examples.
- Node.js
  - Install Node.js and npm.
  - Install dependencies: `npm install`
  - Build: `npm run build --workspace=packages`
    - Note, env var `DB_URI` is required for building.
- Runtime
  - Runtime is supported by Docker.
  - Build the image: `docker-compose build`
  - Run the container: `docker-compose up -d`
  - Lyricova blog is listening at port 59742
  - Jukebox is listening at port 58532

## Etymology

The name _Lyricova_ is a made up word from “lyrics” and “voca” (taken from
_Vocaloid_) or “nova” (taking the meaning of _new_), which signifies a new way
of working with Vocaloid lyrics. This project was previously known as _Project
Gy_ which is taken from its name in Chinese, Gē-yǔ (歌語). 歌 means _songs_, and
語 means _to express_, putting together, Gē-yǔ is making a sense of expressing
oneself through songs and lyrics.

## See also

- [Lyricize](https://github.com/outloudvi/lyricize), a lyrics and quote
  collection site written in Django by @outloudvi. Heavily inspired by Project
  Lyricova (v1).

## License

```
Project Lyricova: A lyrics blogging and music management suite for Vocaloid
Copyright (C) 2013–2023 Eana Hufwe

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
```
