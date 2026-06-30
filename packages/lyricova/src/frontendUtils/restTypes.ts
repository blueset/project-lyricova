/**
 * REST view-model types for the public (REST-fed) pages.
 *
 * The public site fetches entries/tags/etc. over REST (`fetch(${apiBaseUrl}/…)`),
 * so these are built from the OpenAPI contract DTOs (`@lyricova/api/openapi`)
 * rather than the Sequelize/TypeGraphQL model classes. The base OpenAPI schemas
 * describe only scalar columns; the public endpoints additionally include the
 * relations below (and the entry controller injects `videoUrl` on songs), so we
 * augment the base DTOs into the "superset" shape the shared display components
 * expect — the same role the model classes used to play here.
 */
import type {
  Entry as EntryBase,
  Song as SongBase,
  Artist as ArtistBase,
  Verse as VerseBase,
  Tag,
  Pulse,
  ArtistOfSong,
} from "@lyricova/api/openapi";

export type { Tag, Pulse };

/**
 * Verse, with `typingSequence` re-tightened to the tuple shape the renderers
 * expect. OpenAPI can't express tuples, so the generated DTO widens it to
 * `string[][][]`; at runtime each pair is `[base, ruby]`.
 */
export type Verse = Omit<VerseBase, "typingSequence"> & {
  typingSequence?: [string, string][][];
};

/** Artist embedded under a song's `artists` (REST includes the ArtistOfSong junction). */
export type Artist = ArtistBase & { ArtistOfSong?: ArtistOfSong };

/** Song embedded under an entry (REST includes artists; the entry controller injects videoUrl). */
export type Song = SongBase & {
  artists?: Artist[];
  videoUrl?: string;
};

/** Entry as returned by the public REST endpoints, with the relations they include. */
export type Entry = EntryBase & {
  verses: Verse[];
  tags: Tag[];
  pulses: Pulse[];
  songs: Song[];
};
