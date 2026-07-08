import { builder } from "../builder.js";
import { SongRef, ArtistRef, AlbumRef } from "../types/refs.js";
import {
  enrolSongFromVocaDB,
  enrolArtistFromVocaDB,
  enrolAlbumFromVocaDB,
  enrolSongFromUtaiteDB,
  enrolArtistFromUtaiteDB,
  enrolAlbumFromUtaiteDB,
} from "../../../utils/enrol.js";

builder.mutationField("enrolSongFromVocaDB", (t) =>
  t.field({
    type: SongRef,
    description: "Insert or update a song from VocaDB.",
    authScopes: { admin: true },
    args: { songId: t.arg.int({ description: "Song ID in VocaDB" }) },
    resolve: (_root, { songId }) => enrolSongFromVocaDB(songId),
  }),
);

builder.mutationField("enrolArtistFromVocaDB", (t) =>
  t.field({
    type: ArtistRef,
    description: "Insert or update an artist from VocaDB.",
    authScopes: { admin: true },
    args: { artistId: t.arg.int({ description: "Artist ID in VocaDB" }) },
    resolve: (_root, { artistId }) => enrolArtistFromVocaDB(artistId),
  }),
);

builder.mutationField("enrolArtistsFromVocaDB", (t) =>
  t.field({
    type: [ArtistRef],
    description:
      "Insert or update multiple artists from VocaDB in one request.",
    authScopes: { admin: true },
    args: {
      artistIds: t.arg.intList({ description: "Artist IDs in VocaDB" }),
    },
    resolve: (_root, { artistIds }) =>
      Promise.all(artistIds.map((artistId) => enrolArtistFromVocaDB(artistId))),
  }),
);

builder.mutationField("enrolAlbumFromVocaDB", (t) =>
  t.field({
    type: AlbumRef,
    description: "Insert or update an album from VocaDB.",
    authScopes: { admin: true },
    args: { albumId: t.arg.int({ description: "Album ID in VocaDB" }) },
    resolve: (_root, { albumId }) => enrolAlbumFromVocaDB(albumId),
  }),
);

builder.mutationField("enrolSongFromUtaiteDB", (t) =>
  t.field({
    type: SongRef,
    description: "Insert or update a song from UtaiteDB.",
    authScopes: { admin: true },
    args: { songId: t.arg.int({ description: "Song ID in UtaiteDB" }) },
    resolve: (_root, { songId }) => enrolSongFromUtaiteDB(songId),
  }),
);

builder.mutationField("enrolArtistFromUtaiteDB", (t) =>
  t.field({
    type: ArtistRef,
    description: "Insert or update an artist from UtaiteDB.",
    authScopes: { admin: true },
    args: { artistId: t.arg.int({ description: "Artist ID in UtaiteDB" }) },
    resolve: (_root, { artistId }) => enrolArtistFromUtaiteDB(artistId),
  }),
);

builder.mutationField("enrolAlbumFromUtaiteDB", (t) =>
  t.field({
    type: AlbumRef,
    description: "Insert or update an album from UtaiteDB.",
    authScopes: { admin: true },
    args: { albumId: t.arg.int({ description: "Album ID in UtaiteDB" }) },
    resolve: (_root, { albumId }) => enrolAlbumFromUtaiteDB(albumId),
  }),
);
