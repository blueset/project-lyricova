import { and, gt, inArray, eq, sql } from "drizzle-orm";
import { builder } from "../builder";
import { ArtistRef } from "../types/refs";
import { db } from "../../../drizzle/client";
import { Artists } from "../../../drizzle/schema";
import { Artist } from "../../../models/Artist";
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
      ((await db.query.Artists.findFirst({ where: eq(Artists.id, id) })) ?? null) as any,
  })
);

builder.queryField("artists", (t) =>
  t.field({
    type: [ArtistRef],
    resolve: async () =>
      db.query.Artists.findMany({
        orderBy: (a, { asc }) => [asc(a.sortOrder)],
      }) as any,
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
        where: and(inArray(Artists.type, types as any), FILES_FOR_ARTIST),
      }) as any,
  })
);

builder.queryField("searchArtists", (t) =>
  t.field({
    type: [ArtistRef],
    args: { keywords: t.arg.string() },
    resolve: async (_root, { keywords }) =>
      db.query.Artists.findMany({
        where: sql`match (name, sortOrder) against (${keywords} in boolean mode)`,
      }) as any,
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
    resolve: (_root, { data }) => {
      const id = _.random(-2147483648, -1, false);
      return Artist.create({ id, ...data, incomplete: false } as any) as any;
    },
  })
);

builder.mutationField("updateArtist", (t) =>
  t.field({
    type: ArtistRef,
    authScopes: { admin: true },
    args: { id: t.arg.int(), data: t.arg({ type: ArtistInput }) },
    resolve: async (_root, { id, data }) => {
      const artist = await Artist.findByPk(id);
      if (artist === null) {
        throw new Error(`Artist entity with id ${id} is not found.`);
      }
      await artist.update({ id, ...data } as any);
      return artist as any;
    },
  })
);
