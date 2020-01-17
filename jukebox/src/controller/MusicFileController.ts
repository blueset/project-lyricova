import { getRepository, Repository } from "typeorm";
import { MusicFile } from "../entity/MusicFile";
import { Request, Response, NextFunction } from "express";
import glob from "glob";
import { MUSIC_FILES_PATH } from "../utils/secret";

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
    const output = ["<ul>"].concat(
      paths.map(
        i => `<li><code>${i.replace(`${MUSIC_FILES_PATH}`, "")}</code></li>`
      )
    );
    output.push("</ul>");
    response.send(output.join(""));
  }
}
