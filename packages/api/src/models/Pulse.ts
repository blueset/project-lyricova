import type { Entry } from "./Entry.js";

/**
 * @openapi
 * components:
 *   schemas:
 *     Pulse:
 *       type: object
 *       description: A pulse on an entry.
 *       properties:
 *         id:
 *           type: integer
 *           format: int64
 *         entryId:
 *           type: integer
 *           format: int64
 *           description: ID of the entry being pulsed
 *         creationDate:
 *           type: string
 *           format: date-time
 *           description: When the pulse was created
 *       required:
 *         - id
 *         - entryId
 *         - creationDate
 */
export class Pulse {
  id!: number;

  entryId!: number;

  entry!: Entry;

  creationDate!: Date;
}
