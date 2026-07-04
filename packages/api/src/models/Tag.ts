import type { Entry } from "./Entry";

/**
 * @openapi
 * components:
 *   schemas:
 *     Tag:
 *       type: object
 *       description: A tag for categorizing entries.
 *       properties:
 *         slug:
 *           type: string
 *           maxLength: 512
 *           example: "core"
 *           description: URL-friendly identifier for the tag
 *         name:
 *           type: string
 *           maxLength: 1024
 *           example: "Core"
 *           description: Display name of the tag
 *         color:
 *           type: string
 *           maxLength: 16
 *           example: "#39c5bb"
 *           description: Hex color code for the tag
 *       required:
 *         - slug
 *         - name
 *         - color
 */
export class Tag {
  slug!: string;

  name!: string;

  color!: string;

  entries!: Entry[];
}
