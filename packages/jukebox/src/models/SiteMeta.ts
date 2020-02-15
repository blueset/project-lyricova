import { Table, Model, Column, PrimaryKey } from "sequelize-typescript";
import { DataTypes } from "sequelize";


@Table
export class SiteMeta extends Model<SiteMeta> {
  @PrimaryKey
  @Column({ type: new DataTypes.STRING(768) })
  key: string;

  @Column({ type: "text" })
  value: string;
}
