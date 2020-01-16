import {
  Entity,
  PrimaryColumn,
  BaseEntity,
  ManyToOne,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn
} from "typeorm";
import { Song } from "./Song";

export enum VideoType {
  Original = "Original",
  PV = "PV",
  Derived = "Derived",
  Subtitled = "Subtitled",
  OnVocal = "OnVocal",
  OffVocal = "OffVocal",
  Other = "Other"
}

@Entity()
export class VideoFile extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 768, unique: true })
  path: string;

  @ManyToOne(
    () => Song,
    song => song.videos
  )
  song: Song;

  @Column({ type: "varchar", length: 1024 })
  title: string;

  @Column({ type: "varchar", length: 2048, nullable: true })
  sourceUrl: string | null;

  @Column({ type: "enum", enum: VideoType, default: VideoType.Other })
  type: VideoType;

  @CreateDateColumn()
  createdOn: Date;

  @UpdateDateColumn()
  updatedOn: Date;
}
