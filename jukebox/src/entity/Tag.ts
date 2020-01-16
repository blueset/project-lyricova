import { Entity, BaseEntity, PrimaryColumn, Column, ManyToMany } from "typeorm";
import { Entry } from "./Entry";

@Entity()
export class Tag extends BaseEntity {
  @PrimaryColumn({ type: "varchar", length: 512 })
  slug: string;

  @Column({ type: "varchar", length: 1024 })
  name: string;

  @Column({ type: "varchar", length: 16 })
  color: string;

  @ManyToMany(
    type => Entry,
    entry => entry.tags
  )
  entries: Entry[];
}
