import {
  Arg,
  Authorized,
  Field,
  FieldResolver,
  Info,
  InputType,
  Int,
  Mutation,
  Query,
  Resolver,
  Root,
} from "type-graphql";
import { Artist } from "lyricova-common/models/Artist";
import { literal, Op } from "sequelize";
import { Song } from "lyricova-common/models/Song";
import { Album } from "lyricova-common/models/Album";
import _ from "lodash";
import type { VDBArtistType } from "../types/vocadb";
import { GraphQLResolveInfo } from "graphql";
import { getFields } from "lyricova-common/utils/graphQL";

@InputType()
class ArtistInput implements Partial<Artist> {
  @Field()
  name: string;

  @Field()
  sortOrder: string;

  @Field({ nullable: true })
  mainPictureUrl?: string;

  @Field()
  type: VDBArtistType;
}

@Resolver((of) => Artist)
export class ArtistResolver {
  includes(info: GraphQLResolveInfo): string[] {
    const fields = getFields(info);
    return fields.filter(f => f === "songs" || f === "albums");
  }

  @Query((returns) => Artist, { nullable: true })
  public async artist(
    @Arg("id", (type) => Int) id: number,
    @Info() info: GraphQLResolveInfo
  ): Promise<Artist | null> {
    return Artist.findByPk(id, { include: this.includes(info) });
  }

  @Query((returns) => [Artist])
  public async artists(@Info() info: GraphQLResolveInfo): Promise<Artist[]> {
    return Artist.findAll({
      order: ["sortOrder"],
      attributes: { exclude: ["vocaDbJson"] },
      include: this.includes(info),
    });
  }

  @Query((returns) => [Artist])
  public async artistsHasFiles(
    @Arg("types", (type) => [String], {
      defaultValue: [
        "Unknown",
        "Circle",
        "Label",
        "Producer",
        "Animator",
        "Illustrator",
        "Lyricist",
        "Vocaloid",
        "UTAU",
        "CeVIO",
        "OtherVoiceSynthesizer",
        "OtherVocalist",
        "OtherGroup",
        "OtherIndividual",
        "Utaite",
        "Band",
        "Vocalist",
        "Character",
      ],
    })
    types: VDBArtistType[],
    @Info() info: GraphQLResolveInfo
  ): Promise<Artist[]> {
    return Artist.findAll({
      order: ["sortOrder"],
      where: {
        [Op.and]: [
          { type: { [Op.in]: types } },
          literal(`(
            SELECT
              COUNT(MusicFiles.id) 
            FROM ArtistOfSongs 
            INNER JOIN 
              MusicFiles 
            ON
              ArtistOfSongs.songId = MusicFiles.songId
            WHERE 
              ArtistOfSongs.artistId = Artist.id and ArtistOfSongs.artistId = Artist.id 
          ) > 0`),
        ],
      },
      include: this.includes(info),
    });
  }

  @Query((returns) => [Artist])
  public async searchArtists(
    @Arg("keywords") keywords: string,
    @Info() info: GraphQLResolveInfo
  ): Promise<Artist[]> {
    return Artist.findAll({
      where: literal(
        "match (name, sortOrder) against (:keywords in boolean mode)"
      ),
      attributes: { exclude: ["vocaDbJson"] },
      replacements: {
        keywords,
      },
      include: this.includes(info),
    });
  }

  @FieldResolver((type) => Artist, { nullable: true })
  private async baseVoiceBank(@Root() artist: Artist): Promise<Artist | null> {
    return artist.$get("baseVoiceBank");
  }

  @FieldResolver((type) => [Artist], { nullable: true })
  private async derivedVoiceBanks(
    @Root() artist: Artist
  ): Promise<Artist[] | null> {
    return artist.$get("derivedVoiceBanks");
  }

  @FieldResolver((type) => [Song], { nullable: true })
  private async songs(@Root() artist: Artist): Promise<Song[] | null> {
    return artist.$get("songs");
  }

  @FieldResolver((type) => [Album], { nullable: true })
  private async albums(@Root() artist: Artist): Promise<Album[] | null> {
    return artist.$get("albums");
  }

  @Authorized("ADMIN")
  @Mutation((type) => Artist)
  public async newArtist(@Arg("data") data: ArtistInput): Promise<Artist> {
    const id = _.random(-2147483648, -1, false);
    return Artist.create({
      id,
      ...data,
      incomplete: false,
    });
  }

  @Authorized("ADMIN")
  @Mutation((type) => Artist)
  public async updateArtist(
    @Arg("id", (type) => Int) id: number,
    @Arg("data") data: ArtistInput
  ): Promise<Artist> {
    const artist = await Artist.findByPk(id);
    if (artist === null) {
      throw new Error(`Artist entity with id ${id} is not found.`);
    }

    await artist.update({
      id,
      ...data,
    });

    return artist;
  }
}
