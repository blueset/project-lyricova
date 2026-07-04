import type { Song } from "./Song";
import type { User } from "./User";
import type { Tag } from "./Tag";
import type { Verse } from "./Verse";
import type { SongOfEntry } from "./SongOfEntry";
import type { TagOfEntry } from "./TagOfEntry";
import type { Pulse } from "./Pulse";

/**
 * @openapi
 * components:
 *   schemas:
 *     Entry:
 *       type: object
 *       description: A Lyricova blog entry.
 *       properties:
 *         id:
 *           type: integer
 *           format: int64
 *         title:
 *           type: string
 *           maxLength: 512
 *           example: "初音ミクの消失 -DEAD END-"
 *         producersName:
 *           type: string
 *           maxLength: 1024
 *           example: "cosMo@暴走P"
 *         vocalistsName:
 *           type: string
 *           maxLength: 1024
 *           example: "初音ミク"
 *         authorId:
 *           type: integer
 *           format: int64
 *         comment:
 *           oneOf:
 *             - type: string
 *               maxLength: 2048
 *             - type: 'null'
 *         recentActionDate:
 *           type: string
 *           format: date-time
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
 *         - title
 *         - producersName
 *         - vocalistsName
 *         - authorId
 */
export class Entry {
  id!: number;

  title!: string;

  producersName!: string;

  vocalistsName!: string;

  songs!: Array<Song & { SongOfEntry: SongOfEntry }>;

  authorId!: number;

  author!: User;

  comment!: string;

  tags!: Array<Tag & { TagOfEntry: TagOfEntry }>;

  verses!: Verse[];

  pulses!: Pulse[];

  recentActionDate!: Date;

  creationDate!: Date;

  updatedOn!: Date;

  deletionDate!: Date;
}
