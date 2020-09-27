import { Arg, Authorized, Field, FieldResolver, InputType, Int, Mutation, Query, Resolver, Root } from "type-graphql";
import { Artist } from "../models/Artist";
import { literal } from "sequelize";
import { Song } from "../models/Song";
import { Album } from "../models/Album";
import { MusicFile } from "../models/MusicFile";
import _ from "lodash";
import { SongInAlbum } from "../models/SongInAlbum";
import { VDBArtistCategoryType, VDBArtistRoleType } from "../types/vocadb";
import { ArtistOfAlbum } from "../models/ArtistOfAlbum";


@InputType()
class NewArtistOfAlbum implements Partial<ArtistOfAlbum> {
  @Field(type => Int)
  artistId: number;

  @Field(type => String)
  categories: VDBArtistCategoryType;

  @Field(type => [String])
  roles: VDBArtistRoleType[];

  @Field(type => [String])
  effectiveRoles: VDBArtistRoleType[];
}

@InputType()
class NewSongInAlbumOnAlbum implements Partial<SongInAlbum> {
  @Field(type => Int)
  songId: number;

  @Field(type => Int, { nullable: true })
  diskNumber: number;

  @Field(type => Int, { nullable: true })
  trackNumber: number;

  @Field({ nullable: true })
  name: string;
}

@InputType()
class NewAlbumInput implements Partial<Album> {
  @Field()
  name: string;

  @Field()
  sortOrder: string;

  @Field()
  coverUrl: string;

  @Field(type => [NewSongInAlbumOnAlbum])
  songsInAlbum: NewSongInAlbumOnAlbum[];

  @Field(type => [NewArtistOfAlbum])
  artistsOfAlbum: NewArtistOfAlbum[];
}

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

  @Authorized("ADMIN")
  @Mutation(type => Album)
  public async newAlbum(@Arg("data") {
    name, sortOrder, coverUrl, artistsOfAlbum, songsInAlbum
  }: NewAlbumInput): Promise<Album> {
    const id = _.random(-2147483648, -1, false);
    const album = await Album.create({
      id, name, sortOrder, coverUrl,
      incomplete: false,
    });

    await Promise.all(artistsOfAlbum.map(v => album.$add("artist", v.artistId, {
      through: {
        categories: v.categories,
        roles: v.roles,
        effectiveRoles: v.effectiveRoles,
      }
    })));
    await Promise.all(songsInAlbum.map(v => album.$add("song", v.songId, {
      through: {
        name: v.name,
        diskNumber: v.diskNumber,
        trackNumber: v.trackNumber,
      }
    })));

    return album;
  }
}