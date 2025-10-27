import { Table, Model, Column, PrimaryKey } from "sequelize-typescript";
import { DataTypes } from "sequelize";

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
@Table({ modelName: "SiteMeta" })
export class SiteMeta extends Model<SiteMeta> {
  @PrimaryKey
  @Column({ type: new DataTypes.STRING(768) })
  key: string;

  @Column({ type: "text" })
  value: string;
}
