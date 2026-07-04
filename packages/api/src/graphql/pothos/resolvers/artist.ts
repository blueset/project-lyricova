import { and, gt, inArray, eq, sql } from "drizzle-orm";
import { builder } from "../builder";
import { ArtistRef } from "../types/refs";
import { db } from "../../../drizzle/client";
import { Artists } from "../../../drizzle/schema";
import _ from "lodash";

const ArtistInput = builder.inputType("ArtistInput", {
  fields: (t) => ({
    name: t.string(),
    sortOrder: t.string(),
    mainPictureUrl: t.string({ required: false }),
    type: t.string(),
  }),
});

const FILES_FOR_ARTIST = sql`(
            SELECT
              COUNT(MusicFiles.id) 
            FROM ArtistOfSongs 
            INNER JOIN 
              MusicFiles 
            ON
              ArtistOfSongs.songId = MusicFiles.songId
            WHERE 
              ArtistOfSongs.artistId = Artists.id and ArtistOfSongs.artistId = Artists.id 
          ) > 0`;

builder.queryField("artist", (t) =>
  t.field({
    type: ArtistRef,
    nullable: true,
    args: { id: t.arg.int() },
    resolve: async (_root, { id }) =>
      ((await db.query.Artists.findFirst({ where: eq(Artists.id, id) })) ?? null),
  })
);

builder.queryField("artists", (t) =>
  t.field({
    type: [ArtistRef],
    resolve: async () =>
      db.query.Artists.findMany({
        orderBy: (a, { asc }) => [asc(a.sortOrder)],
      }),
  })
);

builder.queryField("artistsHasFiles", (t) =>
  t.field({
    type: [ArtistRef],
    args: {
      types: t.arg.stringList({
        defaultValue: [
          "Unknown",
          "Circle",
          "Label",
          "Producer",
          "Animator",
          "Illustrator",
          "Lyricist",
          "Vocaloid",
          "UTAU",
          "CeVIO",
          "OtherVoiceSynthesizer",
          "OtherVocalist",
          "OtherGroup",
          "OtherIndividual",
          "Utaite",
          "Band",
          "Vocalist",
          "Character",
          "SynthesizerV",
          "CoverArtist",
          "NEUTRINO",
          "VoiSona",
          "NewType",
          "Voiceroid",
        ],
      }),
    },
    resolve: async (_root, { types }) =>
      db.query.Artists.findMany({
        orderBy: (a, { asc }) => [asc(a.sortOrder)],
        where: and(inArray(Artists.type, types as NonNullable<(typeof Artists.$inferInsert)["type"]>[]), FILES_FOR_ARTIST),
      }),
  })
);

builder.queryField("searchArtists", (t) =>
  t.field({
    type: [ArtistRef],
    args: { keywords: t.arg.string() },
    resolve: async (_root, { keywords }) =>
      db.query.Artists.findMany({
        where: sql`match (name, sortOrder) against (${keywords} in boolean mode)`,
      }),
  })
);

builder.queryField("artistsWithFilesNeedEnrol", (t) =>
  t.field({
    type: ["Int"],
    authScopes: { admin: true },
    resolve: async () => {
      const rows = await db.query.Artists.findMany({
        columns: { id: true },
        orderBy: (a, { asc }) => [asc(a.sortOrder)],
        where: and(
          gt(Artists.id, 0),
          eq(Artists.incomplete, true),
          FILES_FOR_ARTIST
        ),
      });
      return rows.map((a) => a.id);
    },
  })
);

builder.mutationField("newArtist", (t) =>
  t.field({
    type: ArtistRef,
    authScopes: { admin: true },
    args: { data: t.arg({ type: ArtistInput }) },
    resolve: async (_root, { data }) => {
      const id = _.random(-2147483648, -1, false);
      const now = new Date();
      await db.insert(Artists).values({
        id,
        name: data.name,
        sortOrder: data.sortOrder,
        mainPictureUrl: data.mainPictureUrl ?? null,
        type: data.type as (typeof Artists.$inferInsert)["type"],
        incomplete: false,
        creationDate: now,
        updatedOn: now,
      });
      return (await db.query.Artists.findFirst({
        where: eq(Artists.id, id),
      }))!;
    },
  })
);

builder.mutationField("updateArtist", (t) =>
  t.field({
    type: ArtistRef,
    authScopes: { admin: true },
    args: { id: t.arg.int(), data: t.arg({ type: ArtistInput }) },
    resolve: async (_root, { id, data }) => {
      const existing = await db.query.Artists.findFirst({
        where: eq(Artists.id, id),
      });
      if (!existing) {
        throw new Error(`Artist entity with id ${id} is not found.`);
      }
      await db
        .update(Artists)
        .set({
          name: data.name,
          sortOrder: data.sortOrder,
          mainPictureUrl: data.mainPictureUrl ?? null,
          type: data.type as (typeof Artists.$inferInsert)["type"],
          updatedOn: new Date(),
        })
        .where(eq(Artists.id, id));
      return (await db.query.Artists.findFirst({
        where: eq(Artists.id, id),
      }))!;
    },
  })
);
