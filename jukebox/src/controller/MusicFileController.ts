import { getRepository, Repository } from "typeorm";
import { MusicFile } from "../entity/MusicFile";
import { Request, Response, NextFunction } from "express";
import glob from "glob";
import { MUSIC_FILES_PATH } from "../utils/secret";
import ffprobe, { Metadata } from "ffprobe-client";
import { get, filter } from "lodash";
import fs from "fs";
import hasha from "hasha";
import pLimit from "p-limit";

export class MusicFileController {
  private musicFileRepository: Repository<MusicFile>;

  constructor() {
    this.musicFileRepository = getRepository(MusicFile);
  }

  async scan(request: Request, response: Response, next: NextFunction) {
    /**
     * Workflow:
     * - Scan path
     * - For each file
     *    - if file not in database -> enrol
     *    - else:
     *      - check file size: same -> pass
     *      - check md5: same -> pass
     *      - update
     *      - mark as need to verify
     */
    const paths = glob.sync(`${MUSIC_FILES_PATH}/**/*.{mp3,flac,aiff,lrc}`, {
      nosort: true,
      nocase: true
    });
    const pathsSet = new Set(paths);
    const output = [
      '<link rel="stylesheet" href="https://unpkg.com/awsm.css/dist/awsm.min.css">',
      "<table><tr><th>File name</th><th>Cover?</th><th>Lyrics?</th><th>Title</th><th>Tilte sort</th><th>Artist</th><th>Artist sort</th><th>Album</th><th>Album sort</th><th>Size</th><th>MD5</th><th>Format</th></tr>"
    ];
    // let counter: int = 0;
    const musicFiles = filter(paths, fn => !fn.toLowerCase().endsWith(".lrc"));
    const limit = pLimit(10);
    // const values: [string, Metadata][] = await mapLimit(
    //   musicFiles,
    //   10,
    //   asyncify(
    //     async (fn: string): Promise<[string, Metadata]> => {
    //       const metadata = await ffprobe(fn);
    //       // console.log(`received medata from ${fn}`);
    //       return [fn, metadata];
    //     }
    //   )
    // );
    const promises = musicFiles.map(fn =>
      limit(
        async (): Promise<[string, Metadata, fs.Stats, string]> => {
          const metadata = ffprobe(fn);
          const stats = fs.promises.stat(fn);
          const md5 = hasha.fromFile(fn, { algorithm: "md5" });
          return [fn, await metadata, await stats, await md5];
        }
      )
    );
    for await (const [fn, metadata, stats, md5] of promises) {
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
      const fileSize = stats.size;
      const md5Prefix = md5.substr(0, 8);
      output.push(
        `<tr><td>${displayFn}</td><td>${hasCover}</td><td>${hasLyrics}</td><td>${title}</td><td>${titleSort}</td><td>${artist}</td><td>${artistSort}</td><td>${album}</td><td>${albumSort}</td><td>${fileSize}</td><td>${md5Prefix}</td><td>${formatName}</td></tr>`
      );
    }
    // console.log(`all ${counter} items processed.`);
    output.push("</table>");
    response.send(output.join(""));
  }
}
