import { Arg, FieldResolver, Int, Query, Resolver, Root } from "type-graphql";
import { Artist } from "../models/Artist";
import { literal } from "sequelize";
import { Song } from "../models/Song";
import { Album } from "../models/Album";
import { MusicFile } from "../models/MusicFile";

@Resolver(of => Album)
export class AlbumResolver {
  @Query(returns => Album, { nullable: true })
  public async artist(@Arg("id", type => Int) id: number): Promise<Album | null> {
    return Album.findByPk(id);
  }

  @Query(returns => [Album])
  public async searchAlbums(@Arg("keywords") keywords: string): Promise<Album[]> {
    return Album.findAll({
      where: literal("match (name, sortOrder) against (:keywords in boolean mode)"),
      replacements: {
        keywords,
      },
    });
  }

  @FieldResolver(type => [Song], { nullable: true })
  private async songs(@Root() album: Album): Promise<Song[] | null> {
    return album.$get("songs");
  }

  @FieldResolver(type => [Artist], { nullable: true })
  private async artists(@Root() album: Album): Promise<Artist[] | null> {
    return album.$get("artists");
  }

  @FieldResolver(type => [MusicFile], { nullable: true })
  private async files(@Root() album: Album): Promise<MusicFile[] | null> {
    return album.$get("files");
  }
}