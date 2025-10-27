import { Entry } from "./Entry";
import {
  Model,
  PrimaryKey,
  Table,
  Column,
  AutoIncrement,
  CreatedAt,
  UpdatedAt,
  DeletedAt,
  BelongsTo,
  ForeignKey,
  AllowNull,
} from "sequelize-typescript";
import { DataTypes } from "sequelize";
import { Field, ObjectType } from "type-graphql";

/**
 * @openapi
 * components:
 *   schemas:
 *     Verse:
 *       type: object
 *       description: A verse or translation of lyrics for an entry.
 *       properties:
 *         id:
 *           type: integer
 *           format: int64
 *         language:
 *           type: string
 *           maxLength: 64
 *           example: "ja"
 *           description: Language code of the verse
 *         isOriginal:
 *           type: boolean
 *           description: Whether this is the original language version
 *         isMain:
 *           type: boolean
 *           description: Whether this is the main verse to display
 *         text:
 *           type: string
 *           description: Plain text content of the verse
 *           example: |
 *             「信じたものは、
 *             都合のいい妄想を
 *             繰り返し映し出す鏡。」
 *         html:
 *           oneOf:
 *             - type: string
 *             - type: 'null'
 *           description: HTML-formatted content of the verse
 *           example: |
 *             「<ruby><rb>信</rb><rt>しん</rt></ruby>じたものは、<br>
 *             　<ruby><rb>都</rb><rt>つ</rt></ruby><ruby><rb>合</rb><rt>ごう</rt></ruby>のいい<ruby><rb>妄</rb><rt>もう</rt></ruby><ruby><rb>想</rb><rt>そう</rt></ruby>を<br>
 *             　<ruby><rb>繰</rb><rt>く</rt></ruby>り<ruby><rb>返</rb><rt>かえ</rt></ruby>し<rb>映</rb><rt>うつ</rt></ruby>し<ruby><rb>出</rb><rt>だ</rt></ruby>す<ruby><rb>鏡</rb><rt>かがみ</rt></ruby>。」
 *         stylizedText:
 *           oneOf:
 *             - type: string
 *             - type: 'null'
 *           example: |
 *             「信じたものは、
 *             　都合のいい妄想を
 *             　繰り返し映し出す鏡。」
 *           description: Stylized text with special formatting
 *         translator:
 *           oneOf:
 *             - type: string
 *             - type: 'null'
 *           description: Name of the translator
 *         typingSequence:
 *           type: array
 *           items:
 *             type: array
 *             items:
 *               type: array
 *               minItems: 2
 *               maxItems: 2
 *               items:
 *                 type: string
 *           description: Sequence for typing animation
 *           example: [[["「信じた", "『しんじた"], ["ものは、", "ものは、"]], [["都合の", "つごうの"], ["いい", "いい"], ["妄想を", "もうそうを"]], [["繰り返し", "くりかえし"], ["映し出す", "うつしだす"], ["鏡。」", "かがみ。」"]]]
 *         entryId:
 *           type: integer
 *           format: int64
 *           description: ID of the associated entry
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
 *         - language
 *         - isOriginal
 *         - isMain
 *         - text
 *         - typingSequence
 *         - entryId
 */
@ObjectType()
@Table({ modelName: "Verse" })
export class Verse extends Model<Verse> {
  @Field()
  @AutoIncrement
  @PrimaryKey
  @Column({ type: new DataTypes.INTEGER() })
  id: number;

  @Field()
  @Column({ type: new DataTypes.STRING(64) })
  language: string;

  @Field()
  @Column({ type: DataTypes.BOOLEAN })
  isOriginal: boolean;

  @Field()
  @Column({ type: DataTypes.BOOLEAN })
  isMain: boolean;

  @Field()
  @Column({ type: new DataTypes.TEXT() })
  text: string;

  @Field({ nullable: true })
  @AllowNull
  @Column({ type: new DataTypes.TEXT() })
  html: string;

  @Field({ nullable: true })
  @AllowNull
  @Column({ type: new DataTypes.TEXT() })
  stylizedText: string;

  @Field({ nullable: true })
  @AllowNull
  @Column({ type: new DataTypes.TEXT() })
  translator: string;

  @Field((type) => [[[String]]])
  @Column({ type: DataTypes.JSON })
  typingSequence: [string, string][][];

  @ForeignKey(() => Entry)
  @Column
  entryId: number;

  @BelongsTo(() => Entry)
  entry: Entry;

  @CreatedAt
  creationDate: Date;

  @UpdatedAt
  updatedOn: Date;

  @DeletedAt
  deletionDate: Date;
}
