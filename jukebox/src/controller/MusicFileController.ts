import { getRepository, Repository } from "typeorm";
import { MusicFile } from "../entity/MusicFile";
import { Request, Response, NextFunction } from "express";
import glob from "glob";
import { MUSIC_FILES_PATH } from "../utils/secret";
import ffprobe, { Metadata } from "ffprobe-client";
import { mapLimit, asyncify } from "async";
import { get, filter } from "lodash";

export class MusicFileController {
  private musicFileRepository: Repository<MusicFile>;

  constructor() {
    this.musicFileRepository = getRepository(MusicFile);
  }

  async scan(request: Request, response: Response, next: NextFunction) {
    const paths = glob.sync(`${MUSIC_FILES_PATH}/**/*.{mp3,flac,aiff,lrc}`, {
      nosort: true,
      nocase: true
    });
    const pathsSet = new Set(paths);
    const output = [
      "<table><tr><th>File name</th><th>Cover?</th><th>Lyrics?</th><th>Title</th><th>Tilte sort</th><th>Artist</th><th>Artist sort</th><th>Album</th><th>Album sort</th><th>Format</th></tr>"
    ];
    // let counter: int = 0;
    const musicFiles = filter(paths, fn => !fn.toLowerCase().endsWith(".lrc"));
    const values: [string, Metadata][] = await mapLimit(
      musicFiles,
      10,
      asyncify(
        async (fn: string): Promise<[string, Metadata]> => {
          const metadata = await ffprobe(fn);
          // console.log(`received medata from ${fn}`);
          return [fn, metadata];
        }
      )
    );
    for (const [fn, metadata] of values) {
      // const metadata = await ffprobe(fn);
      // counter++;
      // if (counter % 10 === 0) console.log(`processing item ${counter}.`);
      const lrcFn = fn.substr(0, fn.lastIndexOf(".")) + ".lrc";
      const hasLyrics = pathsSet.has(lrcFn) ? "✅" : "";
      const tags = metadata.format.tags;
      const title = tags.title || tags.TITLE || "";
      const titleSort = tags["title-sort"] || tags.TITLESORT || "";
      const artist = tags.artist || tags.ARTIST || "";
      const artistSort = tags["artist-sort"] || tags.ARTISTSORT || "";
      const album = tags.album || tags.ALBUM || "";
      const albumSort = tags["album-sort"] || tags.ALBUMSORT || "";
      const hasCover = metadata.streams.some(val => val.codec_type === "video")
        ? "✅"
        : "";
      const formatName = get(metadata, "format.format_name", "");
      const displayFn = fn.replace(MUSIC_FILES_PATH, "");
      output.push(
        `<tr><td>${displayFn}</td><td>${hasCover}</td><td>${hasLyrics}</td><td>${title}</td><td>${titleSort}</td><td>${artist}</td><td>${artistSort}</td><td>${album}</td><td>${albumSort}</td><td>${formatName}</td></tr>`
      );
    }
    // console.log(`all ${counter} items processed.`);
    output.push("</table>");
    response.send(output.join(""));
  }
}
