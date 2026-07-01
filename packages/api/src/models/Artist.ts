import type { ArtistForApiContract, VDBArtistType } from "../types/vocadb";
import type { ArtistOfSong } from "./ArtistOfSong";
import type { ArtistOfAlbum } from "./ArtistOfAlbum";
import type { Song } from "./Song";
import type { Album } from "./Album";

/**
 * @openapi
 * components:
 *   schemas:
 *     Artist:
 *       type: object
 *       description: An artist entry from VocaDB or UtaiteDB.
 *       properties:
 *         id:
 *           type: integer
 *           format: int64
 *           description: VocaDB artist ID for values greater than 0 or internal artist ID otherwise.
 *         name:
 *           type: string
 *           maxLength: 4096
 *           example: "初音ミク"
 *         sortOrder:
 *           type: string
 *           maxLength: 4096
 *           description: Sort order name
 *           example: "はつねみく"
 *         mainPictureUrl:
 *           oneOf:
 *             - type: string
 *               maxLength: 4096
 *               format: uri
 *               example: "https://example.com/picture.jpg"
 *             - type: 'null'
 *           description: URL to the artist’s main picture
 *         type:
 *           type: string
 *           enum:
 *             - Unknown
 *             - Circle
 *             - Label
 *             - Producer
 *             - Animator
 *             - Illustrator
 *             - Lyricist
 *             - Vocaloid
 *             - UTAU
 *             - CeVIO
 *             - OtherVoiceSynthesizer
 *             - OtherVocalist
 *             - OtherGroup
 *             - OtherIndividual
 *             - Utaite
 *             - Band
 *             - Vocalist
 *             - CoverArtist
 *             - SynthesizerV
 *             - Character
 *             - NEUTRINO
 *             - VoiSona
 *             - NewType
 *             - Voiceroid
 *             - Instrumentalist
 *             - Designer
 *           description: Type of artist
 *         baseVoiceBankId:
 *           oneOf:
 *             - type: integer
 *               format: int64
 *             - type: 'null'
 *           description: ID of the base voice bank if this is a derived voice bank
 *         vocaDbJson:
 *           $ref: 'https://vocadb.net/swagger/v1/swagger.json#/components/schemas/ArtistForApiContract'
 *           type: object
 *           description: Full VocaDB or UtaiteDB API response
 *         incomplete:
 *           type: boolean
 *           description: Whether this entry is incomplete and needs more data
 *         utaiteDbId:
 *           oneOf:
 *             - type: integer
 *               format: int64
 *             - type: 'null'
 *           description: UtaiteDB ID if from UtaiteDB
 *         creationDate:
 *           type: string
 *           format: date-time
 *         updatedOn:
 *           type: string
 *           format: date-time
 *         deletionDate:
 *           oneOf:
 *             - type: string
 *               format: date-time
 *             - type: 'null'
 *       required:
 *         - id
 *         - name
 *         - sortOrder
 *         - type
 *         - incomplete
 */
export class Artist {
  id: number;

  name: string;

  sortOrder: string;

  mainPictureUrl?: string;

  type: VDBArtistType;

  songs: Array<Song & { ArtistOfSong: ArtistOfSong }>;

  albums: Array<Album & { ArtistOfAlbum: ArtistOfAlbum }>;

  public baseVoiceBankId!: number | null;

  public baseVoiceBank: Artist | null;

  public readonly derivedVoiceBanks: Artist[];

  vocaDbJson: ArtistForApiContract | null;

  incomplete: boolean;

  utaiteDbId: number | null;

  creationDate: Date;

  updatedOn: Date;

  deletionDate: Date;

  /** ArtistOfSong reflected by Song.$get("artists"), added for GraphQL queries. */
  ArtistOfSong?: Partial<ArtistOfSong>;

  /** ArtistOfAlbum reflected by Album.$get("artists"), added for GraphQL queries. */
  ArtistOfAlbum?: Partial<ArtistOfAlbum>;
}
