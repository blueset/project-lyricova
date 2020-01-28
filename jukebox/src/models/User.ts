import { Model, Table, Column, PrimaryKey, AutoIncrement, CreatedAt, UpdatedAt, DeletedAt, Default } from "sequelize-typescript";
import { DataTypes } from "sequelize";

@Table
export class User extends Model<User> {
  @Column({ type: new DataTypes.INTEGER })
  @PrimaryKey
  @AutoIncrement
  id: number;

  @Column({ type: new DataTypes.STRING(256), unique: true })
  username: string;

  @Column({ type: new DataTypes.STRING(256) })
  displayName: string;

  @Column({ type: new DataTypes.STRING(256) })
  password: string;

  @Column({ type: new DataTypes.STRING(512), unique: true })
  email: string;

  @Column({ type: new DataTypes.ENUM("admin", "guest") })
  @Default("guest")
  role: "admin" | "guest";

  @Column({ type: new DataTypes.STRING(256) })
  provider: string | null;

  @Column({ type: new DataTypes.STRING(1024) })
  provider_id: string | null;

  @CreatedAt
  creationDate: Date;

  @UpdatedAt
  updatedOn: Date;

  @DeletedAt
  deletionDate: Date;
}
