import type { Request, Response } from "express";
import { requireNumericParams } from "../utils/numericParam";
import { Router } from "express";
import {
  and,
  desc,
  eq,
  inArray,
  isNull,
  like,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "../drizzle/client";
import {
  Entries,
  Verses,
  SongOfEntries,
  TagOfEntries,
} from "../drizzle/schema";
import { entryHasMainVerse, fetchEntriesListing } from "../utils/queries";
import { resolve } from "path";
import { readFile } from "node:fs/promises";
import { Resvg } from "@resvg/resvg-js";
import { Readable } from "stream";
import React from "react";
import satori from "satori";
import { shiftinPuncts } from "../utils/typography";

const sourceHanExtraLight = readFile(
  resolve(
    __dirname,
    "../../src/fonts/SourceHanSans-ExtraLight-Subset-hhea.otf",
  ),
);
const sourceHanExtraLightZh = readFile(
  resolve(
    __dirname,
    "../../src/fonts/SourceHanSansSC-ExtraLight-Subset-hhea.otf",
  ),
);
const sourceHanRegular = readFile(
  resolve(__dirname, "../../src/fonts/SourceHanSans-Regular-Subset.otf"),
);
const sourceHanMedium = readFile(
  resolve(__dirname, "../../src/fonts/SourceHanSans-Medium-Subset.otf"),
);
const tsimExtraLightPalt = readFile(
  resolve(__dirname, "../../src/fonts/TsimSans-J-ExtraLight-Palt-hhea.otf"),
);
const tsimRegularPalt = readFile(
  resolve(__dirname, "../../src/fonts/TsimSans-J-Regular-Palt.otf"),
);
const tsimMediumPalt = readFile(
  resolve(__dirname, "../../src/fonts/TsimSans-J-Medium-Palt.otf"),
);
const monaUltraLight = readFile(
  resolve(__dirname, "../../src/fonts/Mona-Sans-UltraLight-hhea.otf"),
);
const monaRegular = readFile(
  resolve(__dirname, "../../src/fonts/Mona-Sans-Regular.otf"),
);
const monaMedium = readFile(
  resolve(__dirname, "../../src/fonts/Mona-Sans-Medium.otf"),
);
const hubotNarrow = readFile(
  resolve(__dirname, "../../src/fonts/Hubot-Sans-RegularNarrow.otf"),
);
const bg = readFile(resolve(__dirname, "../../src/images/og-cover-bg.png"));

export class LyricovaPublicApiController {
  public router: Router;

  constructor() {
    this.router = Router();
    requireNumericParams(this.router, "entryId");
    this.router.get("/search", this.search);
    this.router.get("/verse", this.verse);
    this.router.get("/versesBySong", this.versesBySong);
    this.router.get("/og/:entryId", this.og);
  }

  /**
   * @openapi
   * /search:
   *   get:
   *     summary: Search entries
   *     tags:
   *       - Lyricova public API
   *     parameters:
   *       - in: query
   *         name: query
   *         schema:
   *           type: string
   *         required: true
   *         description: Search query
   *     responses:
   *       200:
   *         description: List of entries matching the search query
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 allOf:
   *                   - $ref: '#/components/schemas/Entry'
   *                   - type: object
   *                     properties:
   *                       verses:
   *                         type: array
   *                         items:
   *                           $ref: '#/components/schemas/Verse'
   *                       tags:
   *                         type: array
   *                         items:
   *                           $ref: '#/components/schemas/Tag'
   *                       pulses:
   *                         type: array
   *                         items:
   *                           $ref: '#/components/schemas/Pulse'
   */
  public search = async (req: Request, res: Response) => {
    const query = Array.isArray(req.query.query)
      ? req.query.query[0]
      : req.query.query;

    const titleMatches = await db
      .select({ id: Entries.id })
      .from(Entries)
      .where(
        and(
          isNull(Entries.deletionDate),
          or(
            like(Entries.title, `%${query}%`),
            like(Entries.producersName, `%${query}%`),
            like(Entries.vocalistsName, `%${query}%`),
          ),
        ),
      );
    const verseMatches = await db
      .select({ entryId: Verses.entryId })
      .from(Verses)
      .where(and(isNull(Verses.deletionDate), like(Verses.text, `%${query}%`)));

    const ids = [
      ...titleMatches.map((e) => e.id),
      ...verseMatches.map((e) => e.entryId),
    ].filter((x): x is number => x != null);

    const distinctIds = [...new Set(ids)];
    if (distinctIds.length === 0) {
      res.status(200).json([]);
      return;
    }

    const ordered = await db
      .select({ id: Entries.id })
      .from(Entries)
      .where(
        and(
          inArray(Entries.id, distinctIds),
          isNull(Entries.deletionDate),
          entryHasMainVerse,
        ),
      )
      .orderBy(desc(Entries.recentActionDate));
    const result = await fetchEntriesListing(
      ordered.map((r) => r.id),
      "asc",
    );

    res.status(200).json(result);
  };

  /**
   * @openapi
   * /verse:
   *   get:
   *     summary: Get a random verse
   *     tags:
   *       - Lyricova public API
   *     parameters:
   *       - in: query
   *         name: type
   *         schema:
   *           type: string
   *           enum: [original, main]
   *         required: false
   *         description: Type of verse to filter by (original or main)
   *       - in: query
   *         name: languages
   *         schema:
   *           type: string
   *         required: false
   *         description: Comma-separated list of language codes to filter by
   *       - in: query
   *         name: tags
   *         schema:
   *           type: string
   *         required: false
   *         description: Comma-separated list of tag slugs to filter by
   *     responses:
   *       200:
   *         description: A random verse matching the specified criteria
   *         content:
   *           application/json:
   *             schema:
   *               allOf:
   *                 - $ref: '#/components/schemas/Verse'
   *                 - type: object
   *                   properties:
   *                     entry:
   *                       allOf:
   *                         - $ref: '#/components/schemas/Entry'
   *                         - type: object
   *                           properties:
   *                             tags:
   *                               type: array
   *                               items:
   *                                 $ref: '#/components/schemas/Tag'
   *       404:
   *         description: No verse found matching the criteria
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   const: "No verse found"
   */
  public verse = async (req: Request, res: Response) => {
    const type = String(req.query.type);
    const languages = (
      Array.isArray(req.query.languages)
        ? req.query.languages
        : (req.query.languages as string)?.split(",")
    ) as string[] | undefined;
    const tags = (
      Array.isArray(req.query.tags)
        ? req.query.tags
        : (req.query.tags as string)?.split(",")
    ) as string[] | undefined;

    const conds: (SQL | undefined)[] = [isNull(Verses.deletionDate)];
    if (type === "original") conds.push(eq(Verses.isOriginal, true));
    else if (type === "main") conds.push(eq(Verses.isMain, true));
    if (languages?.length)
      conds.push(or(...languages.map((l) => like(Verses.language, `${l}%`))));

    let picker = db
      .select({ id: Verses.id, entryId: Verses.entryId })
      .from(Verses)
      .innerJoin(
        Entries,
        and(eq(Entries.id, Verses.entryId), isNull(Entries.deletionDate)),
      )
      .$dynamic();
    if (tags?.length) {
      picker = picker.innerJoin(
        TagOfEntries,
        and(
          eq(TagOfEntries.entryId, Verses.entryId),
          inArray(TagOfEntries.tagId, tags),
        ),
      );
    }
    const picked = await picker
      .where(and(...conds))
      .orderBy(sql`RAND()`)
      .limit(1);

    if (!picked.length) {
      res.status(404).json({ message: "No verse found" });
      return;
    }

    const v = await db.query.Verses.findFirst({
      where: eq(Verses.id, picked[0].id),
      columns: {
        text: true,
        typingSequence: true,
        stylizedText: true,
        html: true,
        isMain: true,
        isOriginal: true,
        language: true,
        entryId: true,
      },
    });
    if (!v) {
      res.status(404).json({ message: "No verse found" });
      return;
    }
    const e = await db.query.Entries.findFirst({
      where: eq(Entries.id, picked[0].entryId as number),
      columns: {
        id: true,
        title: true,
        producersName: true,
        vocalistsName: true,
      },
      with: {
        tagOfEntries: {
          columns: {},
          with: { tag: { columns: { name: true, slug: true, color: true } } },
          ...(tags?.length
            ? {
                where: (toe, { inArray }) => inArray(toe.tagId, tags),
              }
            : {}),
        },
      },
    });

    if (!e) {
      res.status(404).json({ message: "No verse found" });
      return;
    }

    const verse = {
      text: v.text,
      typingSequence: v.typingSequence,
      stylizedText: v.stylizedText,
      html: v.html,
      isMain: v.isMain,
      isOriginal: v.isOriginal,
      language: v.language,
      entryId: v.entryId,
      entry: {
        id: e.id,
        title: e.title,
        producersName: e.producersName,
        vocalistsName: e.vocalistsName,
        tags: (e.tagOfEntries ?? []).flatMap((t) => (t.tag ? [t.tag] : [])),
      },
    };

    res.status(200).header("Access-Control-Allow-Origin", "*").json(verse);
  };

  /**
   * @openapi
   * /versesBySong:
   *   get:
   *     summary: Get verses by song ID
   *     tags:
   *       - Lyricova public API
   *     parameters:
   *       - in: query
   *         name: songId
   *         schema:
   *           type: string
   *         required: true
   *         description: ID of the song to get verses for
   *     responses:
   *       200:
   *         description: List of entries associated with the specified song
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 allOf:
   *                   - $ref: '#/components/schemas/Entry'
   *                   - type: object
   *                     properties:
   *                       verses:
   *                         type: array
   *                         items:
   *                           $ref: '#/components/schemas/Verse'
   *                       tags:
   *                         type: array
   *                         items:
   *                           $ref: '#/components/schemas/Tag'
   *                       pulses:
   *                         type: array
   *                         items:
   *                           $ref: '#/components/schemas/Pulse'
   */
  public versesBySong = async (req: Request, res: Response) => {
    const songId = Array.isArray(req.query.songId)
      ? req.query.songId[0]
      : req.query.songId;

    const idRows = await db
      .select({ id: Entries.id })
      .from(Entries)
      .innerJoin(SongOfEntries, eq(SongOfEntries.entryId, Entries.id))
      .where(
        and(
          eq(SongOfEntries.songId, parseInt(songId as string)),
          isNull(Entries.deletionDate),
          entryHasMainVerse,
        ),
      )
      .orderBy(desc(Entries.recentActionDate));
    const distinctIds = [...new Set(idRows.map((r) => r.id))];
    const result = await fetchEntriesListing(distinctIds, "asc");

    res.status(200).header("Access-Control-Allow-Origin", "*").json(result);
  };

  /**
   * @openapi
   * /og/{entryId}:
   *   get:
   *     summary: Get Open Graph image for an entry
   *     tags:
   *       - Lyricova public API
   *     parameters:
   *       - in: path
   *         name: entryId
   *         schema:
   *           type: integer
   *         required: true
   *         description: ID of the entry to generate Open Graph image for
   *     responses:
   *       200:
   *         description: Open Graph image in PNG format
   *         content:
   *           image/png: {}
   *       404:
   *         description: Entry not found
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "123 is not found."
   */
  public og = async (req: Request, res: Response) => {
    const id: number = parseInt(req.params.entryId as string);

    const entryRow = await db.query.Entries.findFirst({
      where: and(eq(Entries.id, id), isNull(Entries.deletionDate)),
      with: {
        verses: { where: (v, { isNull }) => isNull(v.deletionDate) },
        tagOfEntries: { columns: {}, with: { tag: true } },
      },
    });
    if (!entryRow) {
      return res.status(404).json({ message: `${id} is not found.` });
    }
    const entry = {
      ...entryRow,
      tags: (entryRow.tagOfEntries ?? []).flatMap((t) =>
        t.tag ? [t.tag] : [],
      ),
    };

    const artistString = !entry.producersName
      ? entry.vocalistsName
      : !entry.vocalistsName
        ? entry.producersName
        : `${entry.producersName} feat. ${entry.vocalistsName}`;
    const mainVerse = entry.verses.find((v) => v.isMain);
    if (!mainVerse?.text || !mainVerse.language) {
      return res.status(404).json({ message: "No verse found" });
    }
    const lang = mainVerse.language;
    const lines = mainVerse.text
      .replace(/——/g, "⸺")
      .split("\n")
      .flatMap((line) => {
        let match = line.match(/^([\p{Ps}\p{Pi}"]*)(.*)$/u);
        match = shiftinPuncts(line, match, "「", "」");
        match = shiftinPuncts(line, match, "『", "』");
        match = shiftinPuncts(line, match, "｢", "｣");
        return match ? [match] : [];
      });

    const [
      sourceHanExtraLightData,
      sourceHanRegularData,
      sourceHanMediumData,
      tsimExtraLightPaltData,
      tsimRegularPaltData,
      tsimMediumPaltData,
      monaUltraLightData,
      monaRegularData,
      monaMediumData,
      hubotNarrowData,
      bgData,
    ] = await Promise.all([
      lang.startsWith("zh") ? sourceHanExtraLightZh : sourceHanExtraLight,
      sourceHanRegular,
      sourceHanMedium,
      tsimExtraLightPalt,
      tsimRegularPalt,
      tsimMediumPalt,
      monaUltraLight,
      monaRegular,
      monaMedium,
      hubotNarrow,
      bg,
    ]);

    let t = performance.now();
    const svg = await satori(
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
            paddingTop: 75,
            paddingRight: 75,
            gap: 10,
            width: "100%",
            height: "100%",
            fontFamily: "Mona Sans, Tsim Sans Palt, Tsim Sans",
            backgroundImage: `url(data:image/png;base64,${bgData.toString(
              "base64",
            )})`,
          },
        },
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              flexDirection: "column",
              color: "white",
              fontSize: 62,
              fontWeight: 100,
              height: 440,
              lineHeight: 1.05,
              width: "100%",
              overflow: "hidden",
            },
          },
          ...lines.map((l) =>
            React.createElement(
              "div",
              {
                style: {
                  display: "flex",
                  flexDirection: "row",
                  minHeight: "0.5em",
                },
              },
              React.createElement(
                "div",
                {
                  style: {
                    width: 75,
                    justifyContent: "flex-end",
                  },
                },
                l[1],
              ),
              React.createElement(
                "div",
                { style: { flexGrow: 1, width: 0, textWrap: "balance" } },
                l[2],
              ),
            ),
          ),
        ),
        React.createElement(
          "div",
          {
            style: {
              height: 75,
              display: "flex",
              flexDirection: "column",
              alignSelf: "flex-end",
              alignItems: "flex-end",
              justifyContent: "center",
              fontSize: 20,
              width: "100%",
              paddingLeft: 260,
              gap: 5,
            },
          },
          React.createElement(
            "div",
            {
              style: {
                display: "flex",
                flexDirection: "row",
                fontSize: 18,
                gap: 5,
                fontFamily: "Hubot Sans Narrow",
              },
            },
            ...entry.tags.flatMap((t) =>
              t.name
                ? [
                    React.createElement(
                      "span",
                      {
                        style: {
                          borderRadius: 3,
                          border: "1px solid currentColor",
                          color: t.color,
                          lineHeight: 1,
                          padding: "3px 3px 0",
                        },
                      },
                      t.name.toUpperCase(),
                    ),
                  ]
                : [],
            ),
          ),
          React.createElement(
            "div",
            {
              style: {
                lineHeight: 1,
                fontWeight: 500,
                color: "#ffffff",
                display: "flex",
                height: "24px",
                alignItems: "flex-end",
              },
            },
            entry.title,
          ),
          React.createElement(
            "div",
            {
              style: {
                lineHeight: 1,
                fontWeight: 400,
                color: "rgba(255,255,255,0.7)",
                display: "flex",
                height: "24px",
                alignItems: "flex-end",
              },
            },
            artistString,
          ),
        ),
      ),
      {
        width: 1200,
        height: 675,
        // debug: true,
        fonts: [
          {
            name: "Source Han Sans",
            data: sourceHanExtraLightData,
            weight: 100,
          },
          {
            name: "Source Han Sans",
            data: sourceHanRegularData,
            weight: 400,
          },
          {
            name: "Source Han Sans",
            data: sourceHanMediumData,
            weight: 500,
          },
          {
            name: "Tsim Sans Palt",
            data: tsimExtraLightPaltData,
            weight: 100,
          },
          {
            name: "Tsim Sans Palt",
            data: tsimRegularPaltData,
            weight: 400,
          },
          {
            name: "Tsim Sans Palt",
            data: tsimMediumPaltData,
            weight: 500,
          },
          {
            name: "Mona Sans",
            data: monaUltraLightData,
            weight: 100,
          },
          {
            name: "Mona Sans",
            data: monaRegularData,
            weight: 400,
          },
          {
            name: "Mona Sans",
            data: monaMediumData,
            weight: 500,
          },
          {
            name: "Hubot Sans Narrow",
            data: hubotNarrowData,
            weight: 400,
          },
        ],
      },
    );

    console.info("Satori:", performance.now() - t, "ms");
    t = performance.now();

    const resvg = new Resvg(svg, {
      font: {
        loadSystemFonts: false,
      },
      fitTo: {
        mode: "width",
        value: 1200,
      },
      logLevel: "trace",
    });
    const png = resvg.render().asPng();
    const pngStream = Readable.from(png);
    console.info("Resvg:", performance.now() - t, "ms");

    res.setHeader("Content-Type", "image/png");
    if (process.env.NODE_ENV !== "development") {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    }
    res.statusCode = 200;
    res.statusMessage = "OK";
    pngStream.pipe(res);
  };
}
