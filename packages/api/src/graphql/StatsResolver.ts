import {
  Resolver,
  Query,
  ObjectType,
  Field,
  Int,
  Authorized,
} from "type-graphql";
import { MusicFile } from "../models/MusicFile";
import { Song } from "../models/Song";
import { Artist } from "../models/Artist";
import { Album } from "../models/Album";
import { Entry } from "../models/Entry";
import { Pulse } from "../models/Pulse";
import { Tag } from "../models/Tag";

@ObjectType()
export class DashboardStats {
  @Field((type) => Date)
  revampStartedOn = new Date("2020-06-20T23:44:48");

  @Field((type) => Date)
  aliveStartedOn = new Date("2013-05-20T23:41:56");

  @Field((type) => Int)
  get musicFilesCount(): Promise<number> {
    return MusicFile.count();
  }

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
  
  @Field((type) => Int)
  get reviewedFilesCount(): Promise<number> {
    return MusicFile.count({
      where: { needReview: false },
    });
  }

  @Field((type) => Int)
  get filesHasLyricsCount(): Promise<number> {
    return MusicFile.count({
      where: { hasLyrics: true },
    });
  }

  @Field((type) => Int)
  get filesHasCoverCount(): Promise<number> {
    return MusicFile.count({
      where: { hasCover: true },
    });
  }

  @Field((type) => Int)
  get songCount(): Promise<number> {
    return Song.count();
  }

  @Field((type) => Int)
  get artistCount(): Promise<number> {
    return Artist.count();
  }

  @Field((type) => Int)
  get albumCount(): Promise<number> {
    return Album.count();
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
