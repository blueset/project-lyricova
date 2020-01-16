import {
  Entity,
  PrimaryColumn,
  BaseEntity,
  ManyToOne,
  Column,
  CreateDateColumn,
  UpdateDateColumn
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
  @PrimaryColumn({ type: "varchar", length: 65535 })
  path: string;

  @ManyToOne(
    () => Song,
    song => song.videos
  )
  song: Song;

  @Column({ type: "varchar", length: 4096 })
  title: string;

  @Column({ type: "varchar", length: 32768, nullable: true })
  sourceUrl: string | null;

  @Column({ type: "enum", enum: VideoType, default: VideoType.Other })
  type: VideoType;

  @CreateDateColumn()
  createdOn: Date;

  @UpdateDateColumn()
  updatedOn: Date;
}
