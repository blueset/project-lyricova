import { builder } from "../builder";
import { ArtistRef } from "../types/refs";
import { Artist } from "../../../models/Artist";
import { literal, Op } from "sequelize";
import _ from "lodash";

const ArtistInput = builder.inputType("ArtistInput", {
  fields: (t) => ({
    name: t.string(),
    sortOrder: t.string(),
    mainPictureUrl: t.string({ required: false }),
    type: t.string(),
  }),
});

const FILES_FOR_ARTIST = literal(`(
            SELECT
              COUNT(MusicFiles.id) 
            FROM ArtistOfSongs 
            INNER JOIN 
              MusicFiles 
            ON
              ArtistOfSongs.songId = MusicFiles.songId
            WHERE 
              ArtistOfSongs.artistId = Artist.id and ArtistOfSongs.artistId = Artist.id 
          ) > 0`);

builder.queryField("artist", (t) =>
  t.field({
    type: ArtistRef,
    nullable: true,
    args: { id: t.arg.int() },
    resolve: (_root, { id }) => Artist.findByPk(id),
  })
);

builder.queryField("artists", (t) =>
  t.field({
    type: [ArtistRef],
    resolve: () =>
      Artist.findAll({
        order: ["sortOrder"],
        attributes: { exclude: ["vocaDbJson"] },
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
    resolve: (_root, { types }) =>
      Artist.findAll({
        order: ["sortOrder"],
        where: {
          [Op.and]: [{ type: { [Op.in]: types } }, FILES_FOR_ARTIST],
        },
      }),
  })
);

builder.queryField("searchArtists", (t) =>
  t.field({
    type: [ArtistRef],
    args: { keywords: t.arg.string() },
    resolve: (_root, { keywords }) =>
      Artist.findAll({
        where: literal(
          "match (name, sortOrder) against (:keywords in boolean mode)"
        ),
        attributes: { exclude: ["vocaDbJson"] },
        replacements: { keywords },
      }),
  })
);

builder.queryField("artistsWithFilesNeedEnrol", (t) =>
  t.field({
    type: ["Int"],
    authScopes: { admin: true },
    resolve: async () => {
      const artistsToEnroll = await Artist.findAll({
        attributes: ["id"],
        order: ["sortOrder"],
        where: {
          [Op.and]: [
            { id: { [Op.gt]: 0 } },
            { incomplete: true },
            FILES_FOR_ARTIST,
          ],
        },
      });
      return artistsToEnroll.map((a) => a.id);
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
      return Artist.create({ id, ...data, incomplete: false } as any);
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
      return artist;
    },
  })
);
