import { Request, Response, NextFunction, Router } from "express";
import axios from "axios";
import cheerio from "cheerio";
import { Song } from "../models/Song";
import { SongForApiContract } from "vocadb";
import { LyricsProviderManager, LyricsSearchRequest } from "lyrics-kit";

export class LyricsProvidersController {
  public router: Router;

  private lyricsProvider: LyricsProviderManager;

  constructor() {
    this.router = Router();
    this.router.get("/hmiku", this.hmikuAtWiki);
    this.router.get("/hmiku/:id(\\d+)", this.hmikuAtWikiSingle);
    this.router.get("/vocadb/:id(\\d+)", this.vocaDBSingle);
    this.router.get("/lyrics-kit", this.lyricsKit);
    this.lyricsProvider = new LyricsProviderManager();
  }

  public hmikuAtWiki = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const keyword = req.query.q;
      if (!keyword) {
        return res.status(400).json({
          status: 400,
          error: "No keyword provided on parameter `q`."
        });
      }
      const response = await axios.get<string>("https://w.atwiki.jp/hmiku/", {
        params: {
          cmd: "wikisearch",
          keyword: keyword
        }
      });
      if (response.status !== 200) {
        return res.status(500).json({
          status: response.status,
          error: response.data
        });
      }
      const urlRegex = /(?<=pageid=)\d+/;
      const $ = cheerio.load(response.data);
      const nodes = $("#wikibody ul li");
      const data = nodes
        .filter((_, elm) => {
          const href = $("a", elm).attr("href");
          return Boolean(href && href.match(urlRegex));
        })
        .map((_, elm) => {
          const a = $("a", elm);
          const text = $(elm).text().split("\n").map(x => x.trim()).filter(x => !!x);
          const
            desc = text[1],
            name = a.text(),
            id = a.attr("href").match(urlRegex)[0];
          return {
            id: id,
            name: name,
            desc: desc
          };
        }).get();
      return res.json(data);
    } catch (e) { next(e); }
  }

  public hmikuAtWikiSingle = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id;
      const response = await axios.get<string>(`https://w.atwiki.jp/hmiku/pages/${id}.html`);
      if (response.status !== 200) {
        return res.status(500).json({
          status: response.status,
          error: response.data
        });
      }
      const $ = cheerio.load(response.data);
      const titleNode = $("h2");
      if (!titleNode) {
        return res.status(404).json({
          status: 404,
          error: "Not found"
        });
      }
      const title = titleNode.text();
      const furiganaMatch = $("#wikibody").text().match(/.+(?=【登録タグ)/);
      const furigana = furiganaMatch ? furiganaMatch[0] : null;
      const lyricsTitleNode = $("#wikibody h3:contains(歌詞)");
      let lyrics = null;
      if (lyricsTitleNode) {
        const lyricsNodes = lyricsTitleNode.nextUntil("h3");
        if (lyricsNodes) {
          // Normalize line breaks
          lyrics = lyricsNodes
            .text()
            .replace(/\n{3,}/g, "\n␊\n")
            .replace(/\n\n/g, "\n")
            .replace(/␊/g, "");
        } else {
          console.log("lyricsNodes not found");
        }
      } else {
        console.log("lyricsTitleNode not found");
      }
      return res.json({
        id: id,
        title: title,
        furigana: furigana,
        lyrics: lyrics
      });
    } catch (e) {
      if (e.response && e.response.status === 404) {
        return res.status(404).json({
          status: 404,
          error: "Not found"
        });
      }
      next(e);
    }
  }

  public vocaDBSingle = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id;
      const elm = await Song.findByPk(id);
      if (elm) {
        if (elm.vocaDbJson.lyrics && elm.vocaDbJson.lyrics.length) {
          return res.json(elm.vocaDbJson.lyrics);
        } else {
          if (elm.vocaDbJson.originalVersionId) {
            return res.redirect(`${elm.vocaDbJson.originalVersionId}`);
          }
          return res.json([]);
        }
      }
      const resp = await axios.get<SongForApiContract>(`https://vocadb.net/api/songs/${id}`, {
        params: { fields: "Lyrics" }
      });
      if (resp.data.lyrics && resp.data.lyrics.length) {
        return res.json(resp.data.lyrics);
      } else {
        if (resp.data.originalVersionId) {
          return res.redirect(`${resp.data.originalVersionId}`);
        }
        return res.json([]);
      }
    } catch (e) {
      if (e.response && e.response.status === 404) {
        return res.status(404).json({
          status: 404,
          error: "Not found"
        });
      }
      next(e);
    }
  }

  public lyricsKit = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const artists = req.query.artists, title = req.query.title;
      const duration = parseFloat(req.query.duration) || 0;
      if (title === undefined || artists === undefined) {
        return res.status(400).json({
          status: 400,
          error: "Query parameter `title` and `artists` are required."
        });
      }
      const lyrics = await this.lyricsProvider.getLyrics(
        LyricsSearchRequest.fromInfo(title, artists, duration)
      );
      return res.json(
        lyrics.map(lrc => {
          return {
            lyrics: lrc.toPlainLRC(),
            quality: lrc.quality,
            isMatched: lrc.isMatched(),
            metadata: lrc.metadata,
            tags: lrc.idTags
          };
        })
      );
    } catch (e) {
      next(e);
    }
  }
}