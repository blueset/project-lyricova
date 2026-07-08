import { getJson, getText, HttpError } from "../../../utils/httpFetch.js";
import cheerio from "cheerio";
import { eq } from "drizzle-orm";
import { db } from "../../../drizzle/client.js";
import { Songs } from "../../../drizzle/schema.js";
import type {
  SongForApiContract,
  LyricsForSongContract,
} from "../../../types/vocadb.js";
import { LyricsProviderManager, LyricsSearchRequest } from "lyrics-kit/service";
import type { Lyrics, LyricsMetadata } from "lyrics-kit/core";
import { GraphQLError } from "graphql";
import _ from "lodash";
import { builder } from "../builder.js";
import { pubsub, TOPIC_LYRICS_KIT_RESULT } from "../pubsub.js";

interface HmikuAtWikiSearchResultEntry {
  id: string;
  name: string;
  desc: string;
}

const HmikuAtWikiSearchResultEntryRef =
  builder.objectRef<HmikuAtWikiSearchResultEntry>(
    "HmikuAtWikiSearchResultEntry",
  );

HmikuAtWikiSearchResultEntryRef.implement({
  description: "A search result from 初音ミク@wiki.",
  fields: (t) => ({
    id: t.exposeString("id", { description: "Entry ID." }),
    name: t.exposeString("name", { description: "Entry name." }),
    desc: t.exposeString("desc", {
      description: "A short summary of contents in the entry.",
    }),
  }),
});

interface HmikuAtWikiEntry {
  id: string;
  name: string;
  furigana: string;
  lyrics: string;
}

const HmikuAtWikiEntryRef =
  builder.objectRef<HmikuAtWikiEntry>("HmikuAtWikiEntry");

HmikuAtWikiEntryRef.implement({
  description: "A lyrics entry from 初音ミク@wiki.",
  fields: (t) => ({
    id: t.exposeString("id", { description: "Entry ID." }),
    name: t.exposeString("name", { description: "Entry name." }),
    furigana: t.exposeString("furigana", {
      description: "Furigana of the entry name.",
    }),
    lyrics: t.exposeString("lyrics", { description: "Lyrics content." }),
  }),
});

const VocaDBLyricsEntryRef =
  builder.objectRef<LyricsForSongContract>("VocaDBLyricsEntry");

VocaDBLyricsEntryRef.implement({
  description: "A lyrics entry from VocaDB.",
  fields: (t) => ({
    id: t.exposeInt("id", { description: "Lyrics entry ID." }),
    cultureCodes: t.exposeStringList("cultureCodes", {
      description: "Language/culture codes.",
      nullable: true,
    }),
    source: t.exposeString("source", {
      description: "Source of lyrics.",
      nullable: true,
    }),
    translationType: t.string({
      description: "Type of translation.",
      nullable: true,
      resolve: (e) => e.translationType,
    }),
    url: t.exposeString("url", {
      description: "URL of the source.",
      nullable: true,
    }),
    value: t.exposeString("value", {
      description: "Lyrics content.",
      nullable: true,
    }),
  }),
});

interface LyricsKitLyricsEntry {
  lyrics: string;
  quality?: number;
  isMatched: boolean;
  metadata: LyricsMetadata;
  tags: Record<string, unknown>;
}

export const LyricsKitLyricsEntryRef = builder.objectRef<LyricsKitLyricsEntry>(
  "LyricsKitLyricsEntry",
);

LyricsKitLyricsEntryRef.implement({
  description: "A lyrics entry from lyrics-kit search engine.",
  fields: (t) => ({
    lyrics: t.exposeString("lyrics"),
    quality: t.exposeFloat("quality", {
      description: "Quality of the matching.",
      nullable: true,
    }),
    isMatched: t.exposeBoolean("isMatched", {
      description: "If the query is matched in this entry.",
    }),
    metadata: t.field({ type: "JSONObject", resolve: (e) => e.metadata }),
    tags: t.field({ type: "JSONObject", resolve: (e) => e.tags }),
  }),
});

const LyricsKitSearchOptions = builder.inputType("LyricsKitSearchOptions", {
  fields: (t) => ({
    useLRCX: t.boolean({
      description: "Whether to output LRCX syntax.",
      defaultValue: false,
    }),
    duration: t.float({
      description: "Duration of the song (if known).",
      defaultValue: 0,
    }),
  }),
});

const lyricsProvider = new LyricsProviderManager();

function timeoutPromise<T>(promise: Promise<T>, name: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_resolve, reject) =>
      setTimeout(() => reject(new Error(`Timeout in ${name}`)), 10000),
    ),
  ]);
}

async function vocaDBLyrics(id: number): Promise<LyricsForSongContract[]> {
  try {
    const elm = await db.query.Songs.findFirst({ where: eq(Songs.id, id) });
    if (elm) {
      const vocaDbJson = elm.vocaDbJson as SongForApiContract | null;
      if (vocaDbJson?.lyrics && vocaDbJson.lyrics.length) {
        return vocaDbJson.lyrics;
      } else {
        if (elm.originalId) {
          const original = await vocaDBLyrics(elm.originalId);
          if (original?.length) {
            return original;
          }
        }
      }
    }

    if (id > 0) {
      const resp = await getJson<SongForApiContract>(
        `https://vocadb.net/api/songs/${id}`,
        { fields: "Lyrics" },
      );
      if (resp?.lyrics && resp.lyrics.length) {
        return resp.lyrics;
      } else {
        if (resp.originalVersionId) {
          return vocaDBLyrics(resp.originalVersionId);
        }
        return [];
      }
    } else if (elm?.utaiteDbId) {
      const resp = await getJson<SongForApiContract>(
        `https://utaitedb.net/api/songs/${elm.utaiteDbId}`,
        { fields: "Lyrics" },
      );
      if (resp?.lyrics && resp.lyrics.length) {
        return resp.lyrics;
      }
    }
  } catch (e) {
    if (e instanceof HttpError && e.status === 404) {
      return [];
    }
    throw e;
  }
  return [];
}

builder.queryField("hmikuLyricsSearch", (t) =>
  t.field({
    type: [HmikuAtWikiSearchResultEntryRef],
    args: { keyword: t.arg.string() },
    resolve: async (_root, { keyword }) => {
      const response = await getText("https://w.atwiki.jp/hmiku/", {
        cmd: "wikisearch",
        keyword,
      });
      if (response.status !== 200) {
        throw new GraphQLError(`${response.status}: ${response.data}`);
      }
      const urlRegex = /(?<=pageid=)\d+/;
      const $ = cheerio.load(response.data);
      const nodes = $("#wikibody ul li");
      const data = nodes
        .filter((_idx, elm) => {
          const href = $("a", elm).attr("href");
          return Boolean(href && href.match(urlRegex));
        })
        .map((_idx, elm) => {
          const a = $("a", elm);
          const text = $(elm)
            .text()
            .split("\n")
            .map((x) => x.trim())
            .filter((x) => !!x);
          const desc = text[1],
            name = a.text(),
            href = a.attr("href"),
            id = href?.match(urlRegex)?.[0];
          if (!id) return null;
          return { id, name, desc };
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
        .get();
      return data;
    },
  }),
);

builder.queryField("hmikuLyrics", (t) =>
  t.field({
    type: HmikuAtWikiEntryRef,
    nullable: true,
    args: { id: t.arg.string() },
    resolve: async (_root, { id }) => {
      const response = await getText(
        `https://w.atwiki.jp/hmiku/pages/${id}.html`,
      );
      if (response.status === 404) {
        return null;
      }
      if (response.status !== 200) {
        throw new GraphQLError(`${response.status}: ${response.data}`);
      }
      const $ = cheerio.load(response.data);
      const titleNode = $("h2");
      if (!titleNode) {
        return null;
      }
      const title = titleNode.text();
      const furiganaMatch =
        /(?:【検索用:)?([^:【\n]+?)[\u00a0\s]*【?登録タグ/g.exec(
          $("#wikibody").text(),
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
      return { id, name: title, furigana, lyrics: lyrics ?? "" };
    },
  }),
);

builder.queryField("vocaDBLyrics", (t) =>
  t.field({
    type: [VocaDBLyricsEntryRef],
    args: { id: t.arg.int() },
    resolve: (_root, { id }) => vocaDBLyrics(id),
  }),
);

builder.queryField("lyricsKitSearch", (t) =>
  t.field({
    type: [LyricsKitLyricsEntryRef],
    args: {
      artists: t.arg.string(),
      title: t.arg.string(),
      options: t.arg({ type: LyricsKitSearchOptions }),
      sessionId: t.arg.string({
        required: false,
        description:
          "Session ID for subscribing to incremental search results with `lyricsKitSearchIncremental`.",
      }),
    },
    resolve: async (_root, { artists, title, options, sessionId }) => {
      const { useLRCX, duration } = options;
      const request = LyricsSearchRequest.fromInfo(title, artists, duration);
      const failed: string[] = [];

      const results = await Promise.all(
        lyricsProvider.providers.map(async (v) => {
          try {
            const result = await timeoutPromise(
              v.getLyrics(request),
              v.constructor.name,
            );

            const converted = result.map((lrc: Lyrics) => ({
              lyrics: useLRCX ? lrc.toString() : lrc.toPlainLRC(),
              quality: lrc.quality,
              isMatched: lrc.isMatched(),
              metadata: lrc.metadata,
              tags: lrc.idTags,
            }));
            if (sessionId) {
              for (const data of converted)
                await pubsub.publish(TOPIC_LYRICS_KIT_RESULT, {
                  sessionId,
                  data,
                });
            }
            return converted;
          } catch (e) {
            failed.push(e instanceof Error ? e.message : String(e));
            return [];
          }
        }),
      );

      await pubsub.publish(TOPIC_LYRICS_KIT_RESULT, { sessionId, data: null });

      if (failed.length) {
        throw new GraphQLError(failed.join("\n"));
      }
      return _.flatten(results);
    },
  }),
);
