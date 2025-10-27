import {
  Column,
  Model,
  Table,
  DataType,
  AllowNull,
} from "sequelize-typescript";
import { Field, ObjectType } from "type-graphql";

/**
 * @openapi
 * components:
 *   schemas:
 *     FuriganaMapping:
 *       type: object
 *       description: Mapping of Japanese words to segmented furigana (mono-ruby).
 *       properties:
 *         text:
 *           type: string
 *           maxLength: 128
 *           example: "未来幻想"
 *           description: Original Japanese text
 *         furigana:
 *           type: string
 *           maxLength: 128
 *           example: "みらいげんそう"
 *           description: Furigana pronunciation
 *         segmentedText:
 *           oneOf:
 *             - type: string
 *               maxLength: 128
 *               example: "未,来,幻,想"
 *             - type: 'null'
 *           description: Text segmented by morphemes
 *         segmentedFurigana:
 *           oneOf:
 *             - type: string
 *               maxLength: 128
 *               example: "み,らい,げん,そう"
 *             - type: 'null'
 *           description: Furigana segmented by morphemes
 *       required:
 *         - text
 *         - furigana
 */
@ObjectType()
@Table({ updatedAt: false, createdAt: false, modelName: "FuriganaMapping" })
export class FuriganaMapping extends Model<FuriganaMapping> {
  @Field()
  @Column({ type: new DataType.STRING(128), primaryKey: true })
  text: string;

  @Field()
  @Column({ type: new DataType.STRING(128), primaryKey: true })
  furigana: string;

  @Field({ nullable: true })
  @AllowNull
  @Column({ type: new DataType.STRING(128) })
  segmentedText?: string;

  @Field({ nullable: true })
  @AllowNull
  @Column({ type: new DataType.STRING(128) })
  segmentedFurigana?: string;
}
