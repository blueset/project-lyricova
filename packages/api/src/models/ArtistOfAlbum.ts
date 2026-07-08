import type { VDBArtistRoleType, VDBArtistCategoryType } from "../types/vocadb.js";
import type { Artist } from "./Artist.js";
import type { Album } from "./Album.js";

/**
 * @openapi
 * components:
 *   schemas:
 *     ArtistOfAlbum:
 *       type: object
 *       description: Junction table linking artists to albums with their roles.
 *       properties:
 *         artistOfAlbumId:
 *           type: integer
 *           format: int64
 *         roles:
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
 *           description: Roles specified for the artist
 *         effectiveRoles:
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
 *           description: Effective roles after inheritance
 *         categories:
 *           type: string
 *           enum:
 *             - Nothing
 *             - Vocalist
 *             - Producer
 *             - Animator
 *             - Label
 *             - Circle
 *             - Other
 *             - Band
 *             - Illustrator
 *             - Subject
 *           description: Category of the artist in this album
 *         albumId:
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
 *         - artistOfAlbumId
 *         - roles
 *         - effectiveRoles
 *         - categories
 *         - albumId
 *         - artistId
 */
export class ArtistOfAlbum {
  artistOfAlbumId!: number;

  roles!: VDBArtistRoleType[];

  effectiveRoles!: VDBArtistRoleType[];

  categories!: VDBArtistCategoryType;

  album!: Album;

  albumId!: number;

  artist!: Artist;

  artistId!: number;

  creationDate!: Date;

  updatedOn!: Date;
}
