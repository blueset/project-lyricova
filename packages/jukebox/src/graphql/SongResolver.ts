import { Arg, FieldResolver, Int, Query, Resolver, Root } from "type-graphql";
import { Song } from "../models/Song";
import { literal } from "sequelize";
import { Album } from "../models/Album";
import { MusicFile } from "../models/MusicFile";
import { VideoFile } from "../models/VideoFile";
import { Artist } from "../models/Artist";

@Resolver(of => Song)
export class SongResolver {

  @Query(returns => Song, { nullable: true })
  public async song(@Arg("id", type => Int) id: number): Promise<Song | null> {
    return Song.findByPk(id);
  }

  @Query(returns => [Song])
  public async searchSongs(@Arg("keywords") keywords: string): Promise<Song[]> {
    return Song.findAll({
      where: literal("match (name, sortOrder) against (:keywords in boolean mode)"),
      replacements: {
        keywords,
      },
    });
  }

  @FieldResolver(type => Song, { nullable: true })
  private async original(@Root() song: Song): Promise<Song | null> {
    return song.$get("original");
  }

  @FieldResolver(type => [Song], { nullable: true })
  private async derivedSongs(@Root() song: Song): Promise<Song[] | null> {
    return song.$get("derivedSongs");
  }

  @FieldResolver(type => [Album], { nullable: true })
  private async albums(@Root() song: Song): Promise<Album[] | null> {
    return song.$get("albums");
  }

  @FieldResolver(type => [Artist], { nullable: true })
  private async artists(@Root() song: Song): Promise<Artist[] | null> {
    return song.$get("artists");
  }

  @FieldResolver(type => [MusicFile], { nullable: true })
  private async files(@Root() song: Song): Promise<MusicFile[] | null> {
    return song.$get("files");
  }

  @FieldResolver(type => [VideoFile], { nullable: true })
  private async videos(@Root() song: Song): Promise<VideoFile[] | null> {
    return song.$get("videos");
  }
}