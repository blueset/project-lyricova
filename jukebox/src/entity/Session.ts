import { ISession } from "connect-typeorm";
import { Column, Entity, Index, PrimaryColumn } from "typeorm";

const BigInt = { from: Number, to: Number };

@Entity()
export class Session implements ISession {
  @Index()
  @Column("bigint", { transformer: BigInt, default: Date.now() })
  expiredAt: number = Date.now();

  @PrimaryColumn("varchar", { length: 255 })
  id = "";

  @Column("text")
  json = "";
}
