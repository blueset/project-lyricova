import axios from "axios";
import cheerio from "cheerio";
import { Song } from "lyricova-common/models/Song";
import type {
  SongForApiContract,
  LyricsForSongContract,
  VDBTranslationType,
} from "../types/vocadb";
import { LyricsProviderManager, LyricsSearchRequest } from "lyrics-kit/service";
import type { Lyrics, LyricsMetadata } from "lyrics-kit/core";
import {
  Resolver,
  ObjectType,
  Field,
  Arg,
  Query,
  Int,
  Float,
  InputType,
  PubSub,
  Subscription,
  Root,
} from "type-graphql";
import type { Publisher } from "type-graphql";
import { ApolloError } from "apollo-server-express";
import { GraphQLJSONObject } from "graphql-type-json";
import _ from "lodash";
import type { PubSubSessionPayload } from "./index";

@ObjectType({ description: "A search result from 初音ミク@wiki." })
export class HmikuAtWikiSearchResultEntry {
  @Field({ description: "Entry ID." })
  id: string;

  @Field({ description: "Entry name." })
  name: string;

  @Field({ description: "A short summary of contents in the entry." })
  desc: string;
}

@ObjectType({ description: "A lyrics entry from 初音ミク@wiki." })
export class HmikuAtWikiEntry {
  @Field({ description: "Entry ID." })
  id: string;

  @Field({ description: "Entry name." })
  name: string;
  @Field({ description: "Furigana of the entry name." })
  furigana: string;
  @Field({ description: "Lyrics content." })
  lyrics: string;
}

@ObjectType({ description: "A lyrics entry from VocaDB." })
export class VocaDBLyricsEntry implements LyricsForSongContract {
  @Field((type) => Int, { description: "Lyrics entry ID." })
  id: number;

  @Field({ description: "Language/culture code.", nullable: true })
  cultureCode: string;

  @Field({ description: "Source of lyrics.", nullable: true })
  source: string;

  @Field(/* type => GraphQLString, */{ description: "Type of translation.", nullable: true })
  translationType: VDBTranslationType;

  @Field({ description: "URL of the source.", nullable: true })
  url: string;

  @Field({ description: "Lyrics content.", nullable: true })
  value: string;
}

@InputType()
class LyricsKitSearchOptions {
  @Field({ description: "Whether to output LRCX syntax.", defaultValue: false })
  useLRCX: boolean;

  @Field((type) => Float, {
    description: "Duration of the song (if known).",
    defaultValue: 0,
  })
  duration: number;
}

@ObjectType({ description: "A lyrics entry from lyrics-kit search engine." })
export class LyricsKitLyricsEntry {
  @Field()
  lyrics: string;

  @Field((type) => Float, {
    description: "Quality of the matching.",
    nullable: true,
  })
  quality?: number;

  @Field({ description: "If the query is matched in this entry." })
  isMatched: boolean;

  @Field((type) => GraphQLJSONObject)
  metadata: LyricsMetadata;

  @Field((type) => GraphQLJSONObject)
  tags: Record<string, unknown>;
}

@Resolver()
export class LyricsProvidersResolver {
  private lyricsProvider: LyricsProviderManager;

  constructor() {
    this.lyricsProvider = new LyricsProviderManager();
  }

  @Query((returns) => [HmikuAtWikiSearchResultEntry])
  public async hmikuLyricsSearch(
    @Arg("keyword") keyword: string
  ): Promise<HmikuAtWikiSearchResultEntry[]> {
    const response = await axios.get<string>("https://w.atwiki.jp/hmiku/", {
      params: {
        cmd: "wikisearch",
        keyword: keyword,
      },
    });
    if (response.status !== 200) {
      throw new ApolloError(`${response.status}: ${response.data}`);
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
        const text = $(elm)
          .text()
          .split("\n")
          .map((x) => x.trim())
          .filter((x) => !!x);
        const desc = text[1],
          name = a.text(),
          id = a.attr("href").match(urlRegex)[0];
        return {
          id: id,
          name: name,
          desc: desc,
        };
      })
      .get();
    return data;
  }

  @Query((returns) => HmikuAtWikiEntry, { nullable: true })
  public async hmikuLyrics(
    @Arg("id") id: string
  ): Promise<HmikuAtWikiEntry | null> {
    try {
      const response = await axios.get<string>(
        `https://w.atwiki.jp/hmiku/pages/${id}.html`
      );
      if (response.status !== 200) {
        throw new ApolloError(`${response.status}: ${response.data}`);
      }
      const $ = cheerio.load(response.data);
      const titleNode = $("h2");
      if (!titleNode) {
        return null;
      }
      const title = titleNode.text();
      const furiganaMatch = /(?:【検索用:)?([^:【\n]+?)[\u00a0\s]*【?登録タグ/g.exec(
        $("#wikibody").text()
      );
      console.log("wikibody", JSON.stringify($("#wikibody").text()));
      console.log("wikibody match", furiganaMatch);
      const furigana = furiganaMatch ? furiganaMatch[1] : title;
      console.log("wikibody furigana", furigana);
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
      return {
        id: id,
        name: title,
        furigana: furigana,
        lyrics: lyrics,
      };
    } catch (e) {
      if (e.response && e.response.status === 404) {
        return null;
      }
      throw e;
    }
  }

  @Query((returns) => [VocaDBLyricsEntry])
  public async vocaDBLyrics(
    @Arg("id", (type) => Int) id: number
  ): Promise<VocaDBLyricsEntry[]> {
    try {
      const elm = await Song.findByPk(id);
      if (elm) {
        if (elm.vocaDbJson.lyrics && elm.vocaDbJson.lyrics.length) {
          return elm.vocaDbJson.lyrics;
        } else {
          if (elm.vocaDbJson.originalVersionId) {
            return this.vocaDBLyrics(elm.vocaDbJson.originalVersionId);
          }
          return [];
        }
      }
      const resp = await axios.get<SongForApiContract>(
        `https://vocadb.net/api/songs/${id}`,
        {
          params: { fields: "Lyrics" },
        }
      );
      if (resp.data.lyrics && resp.data.lyrics.length) {
        return resp.data.lyrics;
      } else {
        if (resp.data.originalVersionId) {
          return this.vocaDBLyrics(resp.data.originalVersionId);
        }
        return [];
      }
    } catch (e) {
      if (e.response && e.response.status === 404) {
        return [];
      }
      throw e;
    }
  }

  @Query((returns) => [LyricsKitLyricsEntry])
  public async lyricsKitSearch(
    @Arg("artists") artists: string,
    @Arg("title") title: string,
    @Arg("options") { useLRCX, duration }: LyricsKitSearchOptions,
    @Arg("sessionId", {
      nullable: true,
      description:
        "Session ID for subscribing to incremental search results with `lyricsKitSearchIncremental`.",
    })
    sessionId: string | null,
    @PubSub("LYRICS_KIT_RESULT")
    publish: Publisher<PubSubSessionPayload<LyricsKitLyricsEntry>>
  ): Promise<LyricsKitLyricsEntry[]> {
    const request = LyricsSearchRequest.fromInfo(title, artists, duration);

    const results = await Promise.all(
      this.lyricsProvider.providers.map(async (v) => {
        const result = await v.getLyrics(request);
        const converted = result.map((lrc: Lyrics) => {
          return {
            lyrics: useLRCX ? lrc.toString() : lrc.toPlainLRC(),
            quality: lrc.quality,
            isMatched: lrc.isMatched(),
            metadata: lrc.metadata,
            tags: lrc.idTags,
          };
        });
        if (sessionId) {
          for (const data of converted) await publish({ sessionId, data });
        }
        return converted;
      })
    );

    await publish({ sessionId, data: null });

    return _.flatten(results);
  }

  @Subscription(() => LyricsKitLyricsEntry, {
    topics: "LYRICS_KIT_RESULT",
    filter: ({ payload, args }) => args.sessionId === payload.sessionId,
    nullable: true,
    description:
      "Incremental retrieve results of a `lyricsKitSearch`. Session ID is required when performing search.",
  })
  lyricsKitSearchIncremental(
    @Root() payload: PubSubSessionPayload<LyricsKitLyricsEntry>,
    @Arg("sessionId") sessionId: string
  ): LyricsKitLyricsEntry | null {
    return payload.data;
  }
}
