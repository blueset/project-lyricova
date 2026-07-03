import type { VDBArtistCategoryType, VDBArtistRoleType } from "../types/vocadb";
import type { Song } from "./Song";
import type { Artist } from "./Artist";

/**
 * @openapi
 * components:
 *   schemas:
 *     ArtistOfSong:
 *       type: object
 *       description: Junction table linking artists to songs with their roles.
 *       properties:
 *         artistOfSongId:
 *           type: integer
 *           format: int64
 *         vocaDbId:
 *           oneOf:
 *             - type: integer
 *               format: int64
 *             - type: 'null'
 *           description: VocaDB ID for this artist-song relationship
 *         artistRoles:
 *           type: array
 *           items:
 *             type: string
 *             enum:
 *               - Default
 *               - Animator
 *               - Arranger
 *               - Composer
 *               - Distributor
 *               - Illustrator
 *               - Instrumentalist
 *               - Lyricist
 *               - Mastering
 *               - Publisher
 *               - Vocalist
 *               - VoiceManipulator
 *               - Other
 *               - Mixer
 *               - Chorus
 *               - Encoder
 *               - VocalDataProvider
 *           description: Roles the artist has in this song
 *         categories:
 *           type: array
 *           items:
 *             type: string
 *             enum:
 *               - Nothing
 *               - Vocalist
 *               - Producer
 *               - Animator
 *               - Label
 *               - Circle
 *               - Other
 *               - Band
 *               - Illustrator
 *               - Subject
 *           description: Categories of the artist in this song
 *         customName:
 *           oneOf:
 *             - type: string
 *               maxLength: 4096
 *             - type: 'null'
 *           description: Custom name for the artist in this specific song
 *         isSupport:
 *           type: boolean
 *           description: Whether this is a support/guest artist
 *         songId:
 *           type: integer
 *           format: int64
 *         artistId:
 *           type: integer
 *           format: int64
 *         creationDate:
 *           type: string
 *           format: date-time
 *         updatedOn:
 *           type: string
 *           format: date-time
 *       required:
 *         - artistOfSongId
 *         - artistRoles
 *         - categories
 *         - isSupport
 *         - songId
 *         - artistId
 */
export class ArtistOfSong {
  artistOfSongId: number;

  vocaDbId: number | null;

  artistRoles: VDBArtistRoleType[];

  categories: VDBArtistCategoryType[];

  customName?: string;

  isSupport: boolean;

  song: Song;

  songId: number;

  artist: Artist;

  artistId: number;

  creationDate: Date;

  updatedOn: Date;
}
