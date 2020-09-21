import { Arg, Int, Query, Resolver } from "type-graphql";
import { Song } from "../models/Song";
import { literal } from "sequelize";

@Resolver()
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
}