import type { Request, Response } from "express";
import { Router } from "express";
import { Entry } from "lyricova-common/models/Entry";
import { Verse } from "lyricova-common/models/Verse";
import { Op, fn } from "sequelize";
import { entryListingCondition } from "../utils/queries";
import { resolve } from "path";
import { readFile } from "node:fs/promises";
import { Resvg } from "@resvg/resvg-js";
import { Readable } from "stream";
import React from "react";
import satori from "satori";

const sourceHanExtraLight = readFile(
  resolve(__dirname, "../../src/fonts/SourceHanSans-ExtraLight-Subset-hhea.otf")
);
const sourceHanExtraLightZh = readFile(
  resolve(
    __dirname,
    "../../src/fonts/SourceHanSansSC-ExtraLight-Subset-hhea.otf"
  )
);
const sourceHanRegular = readFile(
  resolve(__dirname, "../../src/fonts/SourceHanSans-Regular-Subset.otf")
);
const sourceHanMedium = readFile(
  resolve(__dirname, "../../src/fonts/SourceHanSans-Medium-Subset.otf")
);
const tsimExtraLightPalt = readFile(
  resolve(__dirname, "../../src/fonts/TsimSans-J-ExtraLight-Palt-hhea.otf")
);
const tsimRegularPalt = readFile(
  resolve(__dirname, "../../src/fonts/TsimSans-J-Regular-Palt.otf")
);
const tsimMediumPalt = readFile(
  resolve(__dirname, "../../src/fonts/TsimSans-J-Medium-Palt.otf")
);
const monaUltraLight = readFile(
  resolve(__dirname, "../../src/fonts/Mona-Sans-UltraLight-hhea.otf")
);
const monaRegular = readFile(
  resolve(__dirname, "../../src/fonts/Mona-Sans-Regular.otf")
);
const monaMedium = readFile(
  resolve(__dirname, "../../src/fonts/Mona-Sans-Medium.otf")
);
const hubotNarrow = readFile(
  resolve(__dirname, "../../src/fonts/Hubot-Sans-RegularNarrow.otf")
);
const bg = readFile(resolve(__dirname, "../../public/images/og-cover-bg.png"));

export class PublicApiController {
  public router: Router;

  constructor() {
    this.router = Router();
    this.router.get("/search", this.search);
    this.router.get("/verse", this.verse);
    this.router.get("/versesBySong", this.versesBySong);
    this.router.get("/og/:entryId", this.og);
  }

  public search = async (req: Request, res: Response) => {
    const query = Array.isArray(req.query.query)
      ? req.query.query[0]
      : req.query.query;

    const entryIds = (await Entry.findAll({
      attributes: ["id"],
      where: {
        [Op.or]: [
          { title: { [Op.like]: `%${query}%` } },
          { producersName: { [Op.like]: `%${query}%` } },
          { vocalistsName: { [Op.like]: `%${query}%` } },
        ],
      },
    })) as Entry[];
    const verseEntryIds = (await Verse.findAll({
      attributes: ["entryId"],
      where: { text: { [Op.like]: `%${query}%` } },
    })) as Verse[];

    const ids = [
      ...entryIds.map((e) => e.id),
      ...verseEntryIds.map((e) => e.entryId),
    ];

    const result = (await Entry.findAll({
      ...entryListingCondition,
      where: {
        id: { [Op.in]: ids },
      },
      order: [["recentActionDate", "DESC"]],
    })) as Entry[];

    res.status(200).json(result);
  };

  public verse = async (req: Request, res: Response) => {
    const type = String(req.query.type);
    const languages = Array.isArray(req.query.languages)
      ? req.query.languages
      : (req.query.languages as string)?.split(",");
    // const tags = Array.isArray(req.query.tags)
    //   ? req.query.tags
    //   : (req.query.tags as string)?.split(",");

    const verseCondition: any = { [Op.and]: [] };
    if (type === "original") verseCondition[Op.and].push({ isOriginal: true });
    else if (type === "main") verseCondition[Op.and].push({ isMain: true });
    if (languages)
      verseCondition[Op.and].push({
        [Op.or]: languages.map((l) => ({ language: { [Op.startsWith]: l } })),
      });

    const verse = (
      await Verse.findOne({
        attributes: [
          "text",
          "typingSequence",
          "stylizedText",
          "html",
          "isMain",
          "isOriginal",
          "language",
          "entryId",
        ],
        where: verseCondition[Op.and].length > 0 ? verseCondition : undefined,
        order: fn("RAND"),
        limit: 1,
        include: [
          {
            association: "entry",
            attributes: ["id", "title", "producersName", "vocalistsName"],
            include: [
              {
                association: "tags",
                attributes: ["name", "slug", "color"],
                through: { attributes: [] },
                // where: tags ? { slug: tags } : undefined,
              },
            ],
          },
        ],
      })
    )?.toJSON();

    res.status(200).header("Access-Control-Allow-Origin", "*").json(verse);
  };

  public versesBySong = async (req: Request, res: Response) => {
    const songId = Array.isArray(req.query.songId)
      ? req.query.songId[0]
      : req.query.songId;

    const result = (await Entry.findAll({
      attributes: entryListingCondition.attributes,
      include: [
        ...entryListingCondition.include,
        {
          association: "songs",
          attributes: [],
          where: { id: songId },
        },
      ],
      order: [["recentActionDate", "DESC"]],
    })) as Entry[];

    res
      .status(200)
      .header("Access-Control-Allow-Origin", "*")
      .json(result.map((e) => e.toJSON()));
  };

  public og = async (req: Request, res: Response) => {
    const id: number = parseInt(req.params.entryId);

    const entry = await Entry.findByPk(id, {
      include: ["verses", "tags"],
    });
    if (!entry) {
      return res.status(404).json({ message: `${id} is not found.` });
    }

    const artistString = !entry.producersName
      ? entry.vocalistsName
      : !entry.vocalistsName
      ? entry.producersName
      : `${entry.producersName} feat. ${entry.vocalistsName}`;
    const mainVerse = entry.verses.find((v) => v.isMain);
    const lang = mainVerse.language;
    const lines = mainVerse.text
      .replace(/——/g, "⸺")
      .split("\n")
      .map((line) => line.match(/^([\p{Ps}\p{Pi}"]*)(.*)$/u));

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
              "base64"
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
                l[1]
              ),
              React.createElement(
                "div",
                { style: { flexGrow: 1, width: 0, textWrap: "balance" } },
                l[2]
              )
            )
          )
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
            ...entry.tags.map((t) =>
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
                t.name.toUpperCase()
              )
            )
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
            entry.title
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
            artistString
          )
        )
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
      }
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
    // res.send(svg);
  };
}
