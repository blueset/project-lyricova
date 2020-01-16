import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BaseEntity
} from "typeorm";

export enum UserRole {
  ADMIN = "admin",
  GUEST = "guest"
}

@Entity()
export class User extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 256, unique: true })
  username: string;

  @Column({ type: "varchar", length: 256 })
  displayName: string;

  @Column({ type: "varchar", length: 256 })
  password: string;

  @Column({ type: "varchar", length: 512, unique: true })
  email: string;

  @Column({ type: "enum", enum: UserRole, default: UserRole.GUEST })
  role: UserRole;

  @Column({ type: "varchar", length: 256 })
  provider: string | null;

  @Column({ type: "varchar", length: 1024 })
  provider_id: string | null;

  @CreateDateColumn()
  createdOn: Date;

  @UpdateDateColumn()
  updatedOn: Date;
}
