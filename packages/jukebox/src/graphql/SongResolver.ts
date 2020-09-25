import { Arg, Field, FieldResolver, InputType, Int, Mutation, Query, Resolver, Root } from "type-graphql";
import { Song } from "../models/Song";
import { literal } from "sequelize";
import { Album } from "../models/Album";
import { MusicFile } from "../models/MusicFile";
import { VideoFile } from "../models/VideoFile";
import { Artist } from "../models/Artist";
import { ArtistOfSong } from "../models/ArtistOfSong";
import { VDBArtistCategoryType, VDBArtistRoleType } from "../types/vocadb";
import { SongInAlbum } from "../models/SongInAlbum";
import _ from "lodash";

@InputType()
class NewArtistOfSong implements Partial<ArtistOfSong> {
  @Field(type => Int)
  artistId: number;

  @Field(type => [String])
  categories: VDBArtistCategoryType[];

  @Field(type => [String])
  artistRoles: VDBArtistRoleType[];

  @Field({ nullable: true })
  customName: string;

  @Field({ defaultValue: false })
  isSupport: boolean;
}

@InputType()
class NewSongInAlbum implements Partial<SongInAlbum> {
  @Field(type => Int)
  albumId: number;

  @Field(type => Int, { nullable: true })
  diskNumber: number;

  @Field(type => Int, { nullable: true })
  trackNumber: number;

  @Field({ nullable: true })
  name: string;
}

@InputType()
class NewSongInput implements Partial<Song> {
  @Field()
  name: string;

  @Field()
  sortOrder: string;

  @Field()
  coverPath: string;

  @Field(type => Int, { nullable: true })
  originalId?: number;

  @Field(type => [NewArtistOfSong])
  artistsOfSong: NewArtistOfSong[];

  @Field(type => [NewSongInAlbum])
  songInAlbums: NewSongInAlbum[];
}

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

  @Mutation(returns => Song)
  public async newSong(@Arg("data") { name, sortOrder, coverPath, originalId, artistsOfSong, songInAlbums }: NewSongInput): Promise<Song> {
    const id = _.random(-2147483648, -1, false);
    const song = await Song.create({
      id, name, sortOrder, coverPath, originalId,
      incomplete: false,
    });
    await Promise.all(artistsOfSong.map(v => song.$add("artist", v.artistId, {
      through: {
        categories: v.categories,
        artistRoles: v.artistRoles,
        customName: v.customName,
        isSupport: v.isSupport,
      }
    })));
    await Promise.all(songInAlbums.map(v => song.$add("albums", v.albumId, {
      through: {
        name: v.name,
        diskNumber: v.diskNumber,
        trackNumber: v.trackNumber,
      }
    })));
    return song;
  }
}