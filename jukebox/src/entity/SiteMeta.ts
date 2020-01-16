import { Entity, BaseEntity, Column, PrimaryColumn } from "typeorm";

@Entity()
export class SiteMeta extends BaseEntity {
  @PrimaryColumn({ type: "varchar", length: 1024 })
  key: string;

  @Column({ type: "text" })
  value: string;
}
