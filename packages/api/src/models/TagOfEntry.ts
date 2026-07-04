/**
 * @openapi
 * components:
 *   schemas:
 *     TagOfEntry:
 *       type: object
 *       description: Junction table linking tags to entries.
 *       properties:
 *         id:
 *           type: integer
 *           format: int64
 *         tagId:
 *           type: string
 *           maxLength: 512
 *           description: Slug of the tag
 *         entryId:
 *           type: integer
 *           format: int64
 *           description: ID of the entry
 *         creationDate:
 *           type: string
 *           format: date-time
 *         updatedOn:
 *           type: string
 *           format: date-time
 *       required:
 *         - id
 *         - tagId
 *         - entryId
 */
export class TagOfEntry {
  public id!: number;

  tagId!: string;

  entryId!: number;

  creationDate!: Date;

  updatedOn!: Date;
}
