import {
  Resolver,
  Query,
  ObjectType,
  Field,
  Int,
  Authorized,
} from "type-graphql";
import { Entry } from "lyricova-common/models/Entry";
import { Pulse } from "lyricova-common/models/Pulse";
import { Tag } from "lyricova-common/models/Tag";

@ObjectType()
export class DashboardStats {
  @Field((type) => Date)
  revampStartedOn = new Date("2020-06-20T23:44:48");

  @Field((type) => Date)
  aliveStartedOn = new Date("2013-05-20T23:41:56");

  @Field((type) => Int)
  get entriesCount(): Promise<number> {
    return Entry.count();
  }

  @Field((type) => Int)
  get pulsesCount(): Promise<number> {
    return Pulse.count();
  }

  @Field((type) => Int)
  get tagsCount(): Promise<number> {
    return Tag.count();
  }
}

@Resolver()
export class StatsResolver {
  @Authorized()
  @Query((returns) => DashboardStats)
  public async dashboardStats(): Promise<DashboardStats | null> {
    return new DashboardStats();
  }
}
