/**
 * Drizzle port of the VocaDB / UtaiteDB import subsystem that used to live as
 * Sequelize static methods on the Song / Artist / Album / ArtistOfSong /
 * ArtistOfAlbum / SongInAlbum models. Consumed by utils/enrol.ts (GraphQL) and
 * the REST VocaDBImportController.
 *
 * Semantics preserved from the legacy code:
 * - `Model.upsert` -> insert ... onDuplicateKeyUpdate (timestamps set explicitly).
 * - `Model.findOrCreate` -> findFirst, else insert the defaults.
 * - belongs-to-many `$set(assoc, items)` carrying through-attributes -> replace
 *   the junction rows for that parent (delete-all-by-parent, then insert), which
 *   yields the same final association + through-attribute state.
 * - `$set("original"/"baseVoiceBank", x)` -> set the FK column.
 * - UtaiteDB imports allocate a free negative id when no VocaDB id is known.
 */
import { and, eq, isNull } from "drizzle-orm";
import _ from "lodash";
import { db } from "../drizzle/client";
import {
  Songs,
  Artists,
  Albums,
  ArtistOfSongs,
  ArtistOfAlbums,
  SongInAlbums,
} from "../drizzle/schema";
import { serializeEnumArray } from "../drizzle/enumArray";
import {
  getUtaiteDbArtistLite,
  getUtaiteDbAlbumLite,
  getVocaDbId,
} from "./vocadb";
import type {
  AlbumContract,
  AlbumForApiContract,
  ArtistContract,
  ArtistForAlbumForApiContract,
  ArtistForApiContract,
  ArtistForSongContract,
  SongForApiContract,
  SongInAlbumForApiContract,
} from "../types/vocadb";

type SongRow = typeof Songs.$inferSelect;
type ArtistRow = typeof Artists.$inferSelect;
type AlbumRow = typeof Albums.$inferSelect;

// The VocaDB/UtaiteDB API contracts type these as plain strings, so narrow them
// to the columns' enum unions when inserting (instead of a blanket `as any`).
type ArtistTypeInsert = (typeof Artists.$inferInsert)["type"];
type AoaCategoriesInsert = (typeof ArtistOfAlbums.$inferInsert)["categories"];

async function transliterate(text: string): Promise<string> {
  const mod = await import("./transliterate.js");
  return mod.transliterate(text);
}

/** Mirrors Song.selectPreferredThumbUrl. */
function selectPreferredThumbUrl(
  vocaDbJson: SongForApiContract | undefined
): string | undefined {
  if (vocaDbJson === undefined) return undefined;
  if (vocaDbJson.pvs?.length) {
    const candidate = vocaDbJson.pvs.find(
      (p) => p.service === "Youtube" && p.pvType === "Original" && p.thumbUrl
    )?.thumbUrl;
    if (candidate) return candidate;
  }
  return vocaDbJson.thumbUrl;
}

async function findUnusedNegativeId(
  table: "song" | "artist" | "album"
): Promise<number> {
  while (true) {
    const id = _.random(-2147483648, -1, false);
    const existing =
      table === "song"
        ? await db.query.Songs.findFirst({ where: eq(Songs.id, id) })
        : table === "artist"
        ? await db.query.Artists.findFirst({ where: eq(Artists.id, id) })
        : await db.query.Albums.findFirst({ where: eq(Albums.id, id) });
    if (!existing) return id;
  }
}

// --------------------------------------------------------------------------
// Artist
// --------------------------------------------------------------------------

/** incomplete build (Artist.fromVocaDBArtistContract). */
async function artistFromVocaDBContract(
  artist: ArtistContract
): Promise<ArtistRow> {
  const existing = await db.query.Artists.findFirst({
    where: and(eq(Artists.id, artist.id), isNull(Artists.deletionDate)),
  });
  if (existing) return existing;
  const now = new Date();
  await db.insert(Artists).values({
    id: artist.id,
    name: artist.name,
    sortOrder: await transliterate(artist.name),
    type: artist.artistType as ArtistTypeInsert,
    incomplete: true,
    creationDate: now,
    updatedOn: now,
  });
  return (await db.query.Artists.findFirst({
    where: eq(Artists.id, artist.id),
  }))!;
}

export async function saveArtistFromVocaDB(
  entity: ArtistForApiContract,
  baseVoiceBank: ArtistRow | null
): Promise<ArtistRow | null> {
  const now = new Date();
  const values = {
    name: entity.name,
    sortOrder: await transliterate(entity.name),
    vocaDbJson: entity,
    mainPictureUrl: entity.mainPicture?.urlOriginal,
    type: entity.artistType as ArtistTypeInsert,
    incomplete: false,
  };
  await db
    .insert(Artists)
    .values({ id: entity.id, ...values, creationDate: now, updatedOn: now })
    .onDuplicateKeyUpdate({ set: { ...values, updatedOn: now } });

  if (baseVoiceBank !== null) {
    await db
      .update(Artists)
      .set({ baseVoiceBankId: baseVoiceBank.id })
      .where(eq(Artists.id, entity.id));
  }
  return (
    (await db.query.Artists.findFirst({
      where: and(eq(Artists.id, entity.id), isNull(Artists.deletionDate)),
    })) ?? null
  );
}

/** incomplete build (Artist.fromUtaiteDBArtistContract). */
async function artistFromUtaiteDBContract(
  entity: ArtistContract
): Promise<ArtistRow> {
  const byUtaite = await db.query.Artists.findFirst({
    where: eq(Artists.utaiteDbId, entity.id),
  });
  let dbId = byUtaite?.id;
  if (dbId === undefined) dbId = await findUnusedNegativeId("artist");

  const existing = await db.query.Artists.findFirst({
    where: eq(Artists.utaiteDbId, entity.id),
  });
  if (existing) return existing;
  const now = new Date();
  await db.insert(Artists).values({
    id: dbId,
    name: entity.name,
    sortOrder: await transliterate(entity.name),
    type: entity.artistType as ArtistTypeInsert,
    utaiteDbId: entity.id,
    incomplete: true,
    creationDate: now,
    updatedOn: now,
  });
  return (await db.query.Artists.findFirst({
    where: eq(Artists.id, dbId),
  }))!;
}

export async function saveArtistFromUtaiteDB(
  entity: ArtistForApiContract,
  baseVoiceBank: ArtistRow | null
): Promise<ArtistRow | null> {
  const byUtaite = await db.query.Artists.findFirst({
    where: eq(Artists.utaiteDbId, entity.id),
  });
  let dbId = byUtaite?.id;
  if (dbId === undefined) dbId = await findUnusedNegativeId("artist");

  const now = new Date();
  const values = {
    name: entity.name,
    sortOrder: await transliterate(entity.name),
    vocaDbJson: entity,
    mainPictureUrl: entity.mainPicture?.urlOriginal,
    type: entity.artistType as ArtistTypeInsert,
    utaiteDbId: entity.id,
    incomplete: false,
  };
  await db
    .insert(Artists)
    .values({ id: dbId, ...values, creationDate: now, updatedOn: now })
    .onDuplicateKeyUpdate({ set: { ...values, updatedOn: now } });

  if (baseVoiceBank !== null) {
    await db
      .update(Artists)
      .set({ baseVoiceBankId: baseVoiceBank.id })
      .where(eq(Artists.id, dbId));
  }
  return (
    (await db.query.Artists.findFirst({ where: eq(Artists.id, dbId) })) ?? null
  );
}

// --------------------------------------------------------------------------
// Album
// --------------------------------------------------------------------------

/** incomplete build (Album.fromVocaDBAlbumContract). */
async function albumFromVocaDBContract(
  entity: AlbumContract
): Promise<AlbumRow> {
  const existing = await db.query.Albums.findFirst({
    where: and(eq(Albums.id, entity.id), isNull(Albums.deletionDate)),
  });
  if (existing) return existing;
  const now = new Date();
  await db.insert(Albums).values({
    id: entity.id,
    name: entity.name,
    sortOrder: await transliterate(entity.name),
    incomplete: true,
    creationDate: now,
    updatedOn: now,
  });
  return (await db.query.Albums.findFirst({
    where: eq(Albums.id, entity.id),
  }))!;
}

/** incomplete build (Album.fromUtaiteDBAlbumContract). */
async function albumFromUtaiteDBContract(
  entity: AlbumContract
): Promise<AlbumRow> {
  const byUtaite = await db.query.Albums.findFirst({
    where: eq(Albums.utaiteDbId, entity.id),
  });
  let dbId = byUtaite?.id;
  if (dbId === undefined) dbId = await findUnusedNegativeId("album");

  const existing = await db.query.Albums.findFirst({
    where: eq(Albums.id, dbId),
  });
  if (existing) return existing;
  const now = new Date();
  await db.insert(Albums).values({
    id: dbId,
    name: entity.name,
    sortOrder: await transliterate(entity.name),
    utaiteDbId: entity.id,
    incomplete: true,
    creationDate: now,
    updatedOn: now,
  });
  return (await db.query.Albums.findFirst({ where: eq(Albums.id, dbId) }))!;
}

export async function saveAlbumFromVocaDB(
  entity: AlbumForApiContract
): Promise<AlbumRow | null> {
  const now = new Date();
  const values = {
    name: entity.name,
    sortOrder: await transliterate(entity.name),
    vocaDbJson: entity,
    coverUrl: entity.mainPicture?.urlOriginal,
    incomplete: false,
  };
  await db
    .insert(Albums)
    .values({ id: entity.id, ...values, creationDate: now, updatedOn: now })
    .onDuplicateKeyUpdate({ set: { ...values, updatedOn: now } });

  const artists = (
    await Promise.all(
      (entity.artists ?? [])
        .filter((x) => x.artist)
        .map((x) => artistOfAlbumFromVocaDB(x))
    )
  ).filter((x): x is ArtistOfAlbumEntry => x !== null);
  const tracks = (
    await Promise.all(
      (entity.tracks ?? [])
        .filter((x) => x.song)
        .map((x) => songInAlbumSongFromVocaDB(x))
    )
  ).filter((t): t is SongInAlbumTrackEntry => t !== null);

  await setArtistsOfAlbum(entity.id, _.uniqBy(artists, (a) => a.artistId));
  await setSongsOfAlbum(entity.id, _.uniqBy(tracks, (t) => t.songId));
  return (
    (await db.query.Albums.findFirst({
      where: and(eq(Albums.id, entity.id), isNull(Albums.deletionDate)),
    })) ?? null
  );
}

export async function saveAlbumFromUtaiteDB(
  entity: AlbumForApiContract,
  tracks: SongRow[]
): Promise<AlbumRow | null> {
  const byUtaite = await db.query.Albums.findFirst({
    where: eq(Albums.utaiteDbId, entity.id),
  });
  let dbId = byUtaite?.id;
  if (dbId === undefined) dbId = await findUnusedNegativeId("album");

  const now = new Date();
  const values = {
    name: entity.name,
    sortOrder: await transliterate(entity.name),
    vocaDbJson: entity,
    coverUrl: entity.mainPicture?.urlOriginal,
    utaiteDbId: entity.id,
    incomplete: false,
  };
  await db
    .insert(Albums)
    .values({ id: dbId, ...values, creationDate: now, updatedOn: now })
    .onDuplicateKeyUpdate({ set: { ...values, updatedOn: now } });

  const artists = (
    await Promise.all(
      (entity.artists ?? [])
        .filter((x) => x.artist)
        .map(async (x) => {
          const { artist, type, isNew } = await processUtaiteDbArtist(x.artist);
          const result =
            type === "vocaDb"
              ? await artistOfAlbumFromVocaDB({ ...x, artist })
              : await artistOfAlbumFromUtaiteDB({ ...x, artist });
          if (result && type === "vocaDb" && isNew) {
            await db
              .update(Artists)
              .set({ utaiteDbId: x.artist.id })
              .where(eq(Artists.id, result.artistId));
          }
          return result;
        })
    )
  ).filter((x): x is ArtistOfAlbumEntry => x !== null);

  const trackEntries = (entity.tracks ?? [])
    .map((x) => {
      const song = tracks.find((t) => t.utaiteDbId === x.song?.id);
      if (!song) return null;
      return {
        songId: song.id,
        name: x.name,
        diskNumber: x.discNumber,
        trackNumber: x.trackNumber,
      } as SongInAlbumTrackEntry;
    })
    .filter((t): t is SongInAlbumTrackEntry => t !== null);

  await setArtistsOfAlbum(dbId, _.uniqBy(artists, (a) => a.artistId));
  await setSongsOfAlbum(dbId, _.uniqBy(trackEntries, (t) => t.songId));
  return (
    (await db.query.Albums.findFirst({ where: eq(Albums.id, dbId) })) ?? null
  );
}

// --------------------------------------------------------------------------
// Song
// --------------------------------------------------------------------------

export async function saveSongFromVocaDB(
  entity: SongForApiContract,
  original: SongRow | null,
  intermediate = false
): Promise<SongRow | null> {
  const now = new Date();
  const values = {
    name: entity.name,
    sortOrder: await transliterate(entity.name),
    vocaDbJson: entity,
    coverUrl: selectPreferredThumbUrl(entity),
    incomplete: intermediate,
  };
  await db
    .insert(Songs)
    .values({ id: entity.id, ...values, creationDate: now, updatedOn: now })
    .onDuplicateKeyUpdate({ set: { ...values, updatedOn: now } });

  if (original !== null) {
    await db
      .update(Songs)
      .set({ originalId: original.id })
      .where(eq(Songs.id, entity.id));
  }

  const artists = (
    await Promise.all(
      (entity.artists ?? []).map((x) => artistOfSongFromVocaDB(x))
    )
  ).filter((x): x is ArtistOfSongEntry => x !== null);
  const albums = (
    await Promise.all(
      (entity.albums ?? []).map((x) => songInAlbumAlbumFromVocaDB(entity, x))
    )
  ).filter((x): x is SongInAlbumAlbumEntry => x !== null);

  await setArtistsOfSong(entity.id, artists);
  await setAlbumsOfSong(entity.id, albums);
  return (
    (await db.query.Songs.findFirst({
      where: and(eq(Songs.id, entity.id), isNull(Songs.deletionDate)),
    })) ?? null
  );
}

export async function saveSongFromUtaiteDB(
  entity: SongForApiContract,
  original: SongRow | null,
  intermediate = false
): Promise<SongRow | null> {
  const byUtaite = await db.query.Songs.findFirst({
    where: eq(Songs.utaiteDbId, entity.id),
  });
  let dbId = byUtaite?.id;
  if (dbId === undefined) dbId = await findUnusedNegativeId("song");

  const now = new Date();
  const values = {
    name: entity.name,
    sortOrder: await transliterate(entity.name),
    vocaDbJson: entity,
    coverUrl: selectPreferredThumbUrl(entity),
    utaiteDbId: entity.id,
    incomplete: intermediate,
  };
  await db
    .insert(Songs)
    .values({ id: dbId, ...values, creationDate: now, updatedOn: now })
    .onDuplicateKeyUpdate({ set: { ...values, updatedOn: now } });

  if (original !== null) {
    await db
      .update(Songs)
      .set({ originalId: original.id })
      .where(eq(Songs.id, dbId));
  }

  const artists = (
    await Promise.all(
      (entity.artists ?? [])
        .filter((x) => x.artist)
        .map(async (x) => {
          const { artist, type, isNew } = await processUtaiteDbArtist(x.artist);
          const result =
            type === "vocaDb"
              ? await artistOfSongFromVocaDB({ ...x, artist })
              : await artistOfSongFromUtaiteDB({ ...x, artist });
          if (result && type === "vocaDb" && isNew) {
            await db
              .update(Artists)
              .set({ utaiteDbId: x.artist.id })
              .where(eq(Artists.id, result.artistId));
          }
          return result;
        })
    )
  ).filter((x): x is ArtistOfSongEntry => x !== null);

  const albums = (
    await Promise.all(
      (entity.albums ?? []).map(async (x) => {
        const { album, type, isNew } = await processUtaiteDbAlbum(x);
        const result =
          type === "vocaDb"
            ? await songInAlbumAlbumFromVocaDB(entity, album)
            : await songInAlbumAlbumFromUtaiteDB(entity, album);
        if (result && type === "vocaDb" && isNew) {
          await db
            .update(Albums)
            .set({ utaiteDbId: x.id })
            .where(eq(Albums.id, result.albumId));
        }
        return result;
      })
    )
  ).filter((x): x is SongInAlbumAlbumEntry => x !== null);

  await setArtistsOfSong(dbId, artists);
  await setAlbumsOfSong(dbId, albums);
  return (
    (await db.query.Songs.findFirst({ where: eq(Songs.id, dbId) })) ?? null
  );
}

// --------------------------------------------------------------------------
// Junction builders (return the through-row payload; create the target).
// --------------------------------------------------------------------------

interface ArtistOfSongEntry {
  artistId: number;
  artistRoles: string[];
  categories: string[];
  customName?: string;
  isSupport: boolean;
}

async function artistOfSongFromVocaDB(
  entity: ArtistForSongContract
): Promise<ArtistOfSongEntry | null> {
  if (entity.artist === undefined) return null;
  const artist = await artistFromVocaDBContract(entity.artist);
  return {
    artistId: artist.id,
    artistRoles: entity.effectiveRoles.split(", "),
    categories: entity.categories.split(", "),
    customName: entity.isCustomName ? entity.name : undefined,
    isSupport: entity.isSupport,
  };
}

async function artistOfSongFromUtaiteDB(
  entity: ArtistForSongContract
): Promise<ArtistOfSongEntry | null> {
  if (entity.artist === undefined) return null;
  const artist = await artistFromUtaiteDBContract(entity.artist);
  return {
    artistId: artist.id,
    artistRoles: entity.effectiveRoles.split(", "),
    categories: entity.categories.split(", "),
    customName: entity.isCustomName ? entity.name : undefined,
    isSupport: entity.isSupport,
  };
}

interface ArtistOfAlbumEntry {
  artistId: number;
  effectiveRoles: string[];
  roles: string[];
  categories: string;
}

async function artistOfAlbumFromVocaDB(
  entity: ArtistForAlbumForApiContract
): Promise<ArtistOfAlbumEntry | null> {
  const artist = await artistFromVocaDBContract(entity.artist);
  return {
    artistId: artist.id,
    effectiveRoles: entity.effectiveRoles.split(", "),
    roles: entity.roles.split(", "),
    categories: entity.categories.split(", ")[0],
  };
}

async function artistOfAlbumFromUtaiteDB(
  entity: ArtistForAlbumForApiContract
): Promise<ArtistOfAlbumEntry | null> {
  const artist = await artistFromUtaiteDBContract(entity.artist);
  return {
    artistId: artist.id,
    effectiveRoles: entity.effectiveRoles.split(", "),
    roles: entity.roles.split(", "),
    categories: entity.categories.split(", ")[0],
  };
}

interface SongInAlbumAlbumEntry {
  albumId: number;
  name?: string;
}

async function songInAlbumAlbumFromVocaDB(
  song: SongForApiContract,
  entity: AlbumContract
): Promise<SongInAlbumAlbumEntry> {
  const album = await albumFromVocaDBContract(entity);
  return { albumId: album.id, name: song.name };
}

async function songInAlbumAlbumFromUtaiteDB(
  song: SongForApiContract,
  entity: AlbumContract
): Promise<SongInAlbumAlbumEntry> {
  const album = await albumFromUtaiteDBContract(entity);
  return { albumId: album.id, name: song.name };
}

interface SongInAlbumTrackEntry {
  songId: number;
  name?: string;
  diskNumber?: number;
  trackNumber?: number;
  vocaDbId?: number;
}

async function songInAlbumSongFromVocaDB(
  entity: SongInAlbumForApiContract
): Promise<SongInAlbumTrackEntry | null> {
  const song = await saveSongFromVocaDB(entity.song, null, true);
  if (!song) return null;
  return {
    songId: song.id,
    name: entity.name,
    diskNumber: entity.discNumber,
    trackNumber: entity.trackNumber,
    vocaDbId: entity.id,
  };
}

// --------------------------------------------------------------------------
// Association "set" helpers (replace the junction rows for a parent).
// --------------------------------------------------------------------------

async function setArtistsOfSong(
  songId: number,
  entries: ArtistOfSongEntry[]
): Promise<void> {
  await db.delete(ArtistOfSongs).where(eq(ArtistOfSongs.songId, songId));
  if (!entries.length) return;
  const now = new Date();
  await db.insert(ArtistOfSongs).values(
    entries.map((e) => ({
      songId,
      artistId: e.artistId,
      artistRoles: serializeEnumArray(e.artistRoles),
      categories: serializeEnumArray(e.categories),
      customName: e.customName ?? "",
      isSupport: e.isSupport,
      creationDate: now,
      updatedOn: now,
    }))
  );
}

async function setAlbumsOfSong(
  songId: number,
  entries: SongInAlbumAlbumEntry[]
): Promise<void> {
  await db.delete(SongInAlbums).where(eq(SongInAlbums.songId, songId));
  if (!entries.length) return;
  const now = new Date();
  await db.insert(SongInAlbums).values(
    entries.map((e) => ({
      songId,
      albumId: e.albumId,
      name: e.name,
      creationDate: now,
      updatedOn: now,
    }))
  );
}

async function setArtistsOfAlbum(
  albumId: number,
  entries: ArtistOfAlbumEntry[]
): Promise<void> {
  await db.delete(ArtistOfAlbums).where(eq(ArtistOfAlbums.albumId, albumId));
  if (!entries.length) return;
  const now = new Date();
  await db.insert(ArtistOfAlbums).values(
    entries.map((e) => ({
      albumId,
      artistId: e.artistId,
      effectiveRoles: serializeEnumArray(e.effectiveRoles),
      roles: serializeEnumArray(e.roles),
      categories: e.categories as AoaCategoriesInsert,
      creationDate: now,
      updatedOn: now,
    }))
  );
}

async function setSongsOfAlbum(
  albumId: number,
  entries: SongInAlbumTrackEntry[]
): Promise<void> {
  await db.delete(SongInAlbums).where(eq(SongInAlbums.albumId, albumId));
  if (!entries.length) return;
  const now = new Date();
  await db.insert(SongInAlbums).values(
    entries.map((e) => ({
      albumId,
      songId: e.songId,
      name: e.name,
      diskNumber: e.diskNumber,
      trackNumber: e.trackNumber,
      vocaDbId: e.vocaDbId,
      creationDate: now,
      updatedOn: now,
    }))
  );
}

// --------------------------------------------------------------------------
// UtaiteDB id resolution (Drizzle port of utils/vocadb.ts processUtaiteDb*).
// --------------------------------------------------------------------------

export async function processUtaiteDbArtist(artist: ArtistContract): Promise<{
  artist: ArtistContract;
  type: "vocaDb" | "utaiteDb";
  isNew: boolean;
}> {
  const existing = await db.query.Artists.findFirst({
    where: eq(Artists.utaiteDbId, artist.id),
  });
  if (existing) {
    return { artist: { ...artist, id: existing.id }, type: "vocaDb", isNew: false };
  }
  const artistLite = await getUtaiteDbArtistLite(artist.id);
  const vocaDbId = getVocaDbId(artistLite);
  if (vocaDbId) {
    return { artist: { ...artist, id: vocaDbId }, type: "vocaDb", isNew: true };
  }
  return { artist, type: "utaiteDb", isNew: true };
}

export async function processUtaiteDbAlbum(album: AlbumContract): Promise<{
  album: AlbumContract;
  type: "vocaDb" | "utaiteDb";
  isNew: boolean;
}> {
  const existing = await db.query.Albums.findFirst({
    where: eq(Albums.utaiteDbId, album.id),
  });
  if (existing) {
    return { album: { ...album, id: existing.id }, type: "vocaDb", isNew: false };
  }
  const albumLite = await getUtaiteDbAlbumLite(album.id);
  const vocaDbId = getVocaDbId(albumLite);
  if (vocaDbId) {
    return { album: { ...album, id: vocaDbId }, type: "vocaDb", isNew: true };
  }
  return { album, type: "utaiteDb", isNew: true };
}
