import {
  PrimaryGeneratedColumn,
  Entity,
  BaseEntity,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn
} from "typeorm";
import { Entry } from "./Entry";

@Entity()
export class Verse extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 64 })
  language: string;

  @Column({ type: "boolean" })
  isOriginal: boolean;

  @Column({ type: "boolean" })
  isMain: boolean;

  @Column({ type: "text" })
  text: string;

  @Column({ type: "text" })
  html: string;

  @Column({ type: "text" })
  stylizedText: string;

  @Column({ type: "json" })
  typingSequence: string;

  @ManyToOne(
    () => Entry,
    entry => entry.verses
  )
  entry: Entry;

  @CreateDateColumn()
  createdOn: Date;

  @UpdateDateColumn()
  updatedOn: Date;
}
