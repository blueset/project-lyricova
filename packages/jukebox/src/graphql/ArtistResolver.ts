import { Arg, Authorized, Field, FieldResolver, InputType, Int, Mutation, Query, Resolver, Root } from "type-graphql";
import { Artist } from "../models/Artist";
import { literal } from "sequelize";
import { Song } from "../models/Song";
import { Album } from "../models/Album";
import _ from "lodash";
import { VDBArtistType } from "../types/vocadb";

@InputType()
class NewArtistInput implements Partial<Artist> {
  @Field()
  name: string;

  @Field()
  sortOrder: string;

  @Field({nullable: true})
  mainPictureUrl?: string;

  @Field()
  type: VDBArtistType;
}

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

  @Authorized("ADMIN")
  @Mutation(type => Artist)
  public async newArtist(@Arg("data") data: NewArtistInput): Promise<Artist> {
    const id = _.random(-2147483648, -1, false);
    return Artist.create({
      id, ...data,
      incomplete: false,
    });
  }
}