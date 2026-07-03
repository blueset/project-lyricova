/**
 * Stable, ORM-independent type surface for the REST API contract.
 *
 * Generated from the OpenAPI 3.1 document (which swagger-jsdoc builds from the
 * hand-written `@openapi` JSDoc) via `openapi-typescript`. This is the REST
 * counterpart to `@lyricova/api/graphql/types`: frontend code that consumes
 * REST endpoints (e.g. lyricova's public pages) should import entity DTO shapes
 * from here instead of the API's internal model classes.
 *
 * Note: on the wire these are JSON, so date-time fields are ISO `string`s (not
 * `Date`), matching what `fetch().json()` actually returns.
 *
 * Regenerate with `npm run openapi -w @lyricova/api`.
 */
import type { components, paths, operations } from "./schema";

export type { components, paths, operations };

type Schemas = components["schemas"];

/** Successful (200) JSON response body for a GET endpoint, e.g.
 *  `GetJson<"/entries/{entryId}">`. Useful for the composite endpoints whose
 *  shapes are `allOf`-composed in the spec rather than a single named schema. */
export type GetJson<P extends keyof paths> = paths[P] extends {
  get: {
    responses: {
      200: { content: { "application/json": infer R } };
    };
  };
}
  ? R
  : never;

// --- Base entity DTO aliases (mirror the names the frontend imported from the
//     model classes, so REST consumers can swap the import path with no churn) ---
export type Album = Schemas["Album"];
export type Artist = Schemas["Artist"];
export type ArtistOfAlbum = Schemas["ArtistOfAlbum"];
export type ArtistOfSong = Schemas["ArtistOfSong"];
export type Entry = Schemas["Entry"];
export type FileInPlaylist = Schemas["FileInPlaylist"];
export type FuriganaMapping = Schemas["FuriganaMapping"];
export type MusicFile = Schemas["MusicFile"];
export type Playlist = Schemas["Playlist"];
export type Pulse = Schemas["Pulse"];
export type SiteMeta = Schemas["SiteMeta"];
export type Song = Schemas["Song"];
export type SongInAlbum = Schemas["SongInAlbum"];
export type SongOfEntry = Schemas["SongOfEntry"];
export type Tag = Schemas["Tag"];
export type TagOfEntry = Schemas["TagOfEntry"];
export type User = Schemas["User"];
export type UserPublicKeyCredential = Schemas["UserPublicKeyCredential"];
export type Verse = Schemas["Verse"];
export type VideoFile = Schemas["VideoFile"];
