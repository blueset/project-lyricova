import type { Song } from "./Song";

/**
 * @openapi
 * components:
 *   schemas:
 *     VideoFile:
 *       type: object
 *       description: A video file associated with a song.
 *       properties:
 *         id:
 *           type: integer
 *           format: int64
 *         path:
 *           type: string
 *           maxLength: 768
 *           description: Local path to the video file
 *         songId:
 *           type: integer
 *           format: int64
 *           description: ID of the associated song
 *         title:
 *           type: string
 *           maxLength: 1024
 *           description: Title of the video
 *         sourceUrl:
 *           oneOf:
 *             - type: string
 *               maxLength: 2048
 *               format: uri
 *             - type: 'null'
 *           description: Original URL of the video source
 *         type:
 *           type: string
 *           enum:
 *             - Original
 *             - PV
 *             - Derived
 *             - Subtitled
 *             - OnVocal
 *             - OffVocal
 *             - Other
 *           description: Type of video content
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
 *         - path
 *         - songId
 *         - title
 *         - type
 */
export class VideoFile {
  id!: number;

  path!: string;

  songId!: number;

  song!: Song;

  title!: string;

  sourceUrl?: string;

  type!:
      | "Original"
      | "PV"
      | "Derived"
      | "Subtitled"
      | "OnVocal"
      | "OffVocal"
      | "Other";

  creationDate!: Date;

  updatedOn!: Date;

  deletionDate!: Date;
}
