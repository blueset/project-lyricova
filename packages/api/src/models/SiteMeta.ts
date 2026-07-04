/**
 * @openapi
 * components:
 *   schemas:
 *     SiteMeta:
 *       type: object
 *       description: Key-value store for site metadata and configuration.
 *       properties:
 *         key:
 *           type: string
 *           maxLength: 768
 *           example: "site_title"
 *           description: Unique key for the metadata entry
 *         value:
 *           type: string
 *           description: Value stored for this key
 *       required:
 *         - key
 *         - value
 */
export class SiteMeta {
  key!: string;

  value!: string;
}
