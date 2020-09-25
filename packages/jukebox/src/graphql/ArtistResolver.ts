import { Arg, FieldResolver, Int, Query, Resolver, Root } from "type-graphql";
import { Artist } from "../models/Artist";
import { literal } from "sequelize";
import { Song } from "../models/Song";
import { Album } from "../models/Album";

@Resolver(of => Artist)
export class ArtistResolver {
  @Query(returns => Artist, { nullable: true })
  public async artist(@Arg("id", type => Int) id: number): Promise<Artist | null> {
    return Artist.findByPk(id);
  }

  @Query(returns => [Artist])
  public async searchArtists(@Arg("keywords") keywords: string): Promise<Artist[]> {
    return Artist.findAll({
      where: literal("match (name, sortOrder) against (:keywords in boolean mode)"),
      replacements: {
        keywords,
      },
    });
  }

  @FieldResolver(type => Artist, { nullable: true })
  private async baseVoiceBank(@Root() artist: Artist): Promise<Artist | null> {
    return artist.$get("baseVoiceBank");
  }

  @FieldResolver(type => [Artist], { nullable: true })
  private async derivedVoiceBanks(@Root() artist: Artist): Promise<Artist[] | null> {
    return artist.$get("derivedVoiceBanks");
  }

  @FieldResolver(type => [Song], { nullable: true })
  private async songs(@Root() artist: Artist): Promise<Song[] | null> {
    return artist.$get("songs");
  }

  @FieldResolver(type => [Album], { nullable: true })
  private async albums(@Root() artist: Artist): Promise<Album[] | null> {
    return artist.$get("albums");
  }
}