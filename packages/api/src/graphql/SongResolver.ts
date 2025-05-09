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
import { Song } from "../models/Song";
import { literal } from "sequelize";
import { Album } from "../models/Album";
import { MusicFile } from "../models/MusicFile";
import { VideoFile } from "../models/VideoFile";
import { Artist } from "../models/Artist";
import { ArtistOfSong } from "../models/ArtistOfSong";
import type { VDBArtistCategoryType, VDBArtistRoleType } from "../types/vocadb";
import { SongInAlbum } from "../models/SongInAlbum";
import _ from "lodash";
import type { GraphQLResolveInfo } from "graphql";
import { getFields } from "../utils/graphQL";

@InputType()
class ArtistOfSongInput implements Partial<ArtistOfSong> {
  @Field((type) => Int)
  artistId: number;

  @Field((type) => [String])
  categories: VDBArtistCategoryType[];

  @Field((type) => [String])
  artistRoles: VDBArtistRoleType[];

  @Field({ nullable: true })
  customName: string;

  @Field({ defaultValue: false })
  isSupport: boolean;
}

@InputType()
class SongInAlbumOnSongInput implements Partial<SongInAlbum> {
  @Field((type) => Int)
  albumId: number;

  @Field((type) => Int, { nullable: true })
  diskNumber: number;

  @Field((type) => Int, { nullable: true })
  trackNumber: number;

  @Field({ nullable: true })
  name: string;
}

@InputType()
class SongInput implements Partial<Song> {
  @Field()
  name: string;

  @Field()
  sortOrder: string;

  @Field()
  coverUrl: string;

  @Field((type) => Int, { nullable: true })
  originalId?: number;

  @Field((type) => [ArtistOfSongInput])
  artistsOfSong: ArtistOfSongInput[];

  @Field((type) => [SongInAlbumOnSongInput])
  songInAlbums: SongInAlbumOnSongInput[];
}

@Resolver((of) => Song)
export class SongResolver {
  includes(info: GraphQLResolveInfo): string[] {
    const fields = getFields(info);
    return fields.filter(
      (f) => f === "files" || f === "artists" || f === "albums"
    );
  }

  @Query((returns) => Song, { nullable: true })
  public async song(
    @Arg("id", (type) => Int) id: number,
    @Info() info: GraphQLResolveInfo
  ): Promise<Song | null> {
    return Song.findByPk(id, { include: this.includes(info) });
  }

  @Query((returns) => [Song])
  public async searchSongs(
    @Arg("keywords") keywords: string,
    @Info() info: GraphQLResolveInfo
  ): Promise<Song[]> {
    const whereClause = isNaN(Number(keywords))
      ? literal(
          "match (Song.name, Song.sortOrder) against (:keywords in boolean mode)"
        )
      : literal(
          "match (Song.name, Song.sortOrder) against (:keywords in boolean mode) OR Song.id = :numericKeywords"
        );

    return Song.findAll({
      where: whereClause,
      attributes: { exclude: ["vocaDbJson"] },
      replacements: {
        keywords,
        numericKeywords: Number(keywords),
      },
      include: this.includes(info),
    });
  }

  @Query((returns) => [Song])
  public async songs(@Info() info: GraphQLResolveInfo): Promise<Song[]> {
    return Song.findAll({
      order: ["sortOrder"],
      attributes: { exclude: ["vocaDbJson"] },
      include: this.includes(info),
    });
  }

  @FieldResolver((type) => Song, { nullable: true })
  private async original(@Root() song: Song): Promise<Song | null> {
    return song.$get("original");
  }

  @FieldResolver((type) => [Song], { nullable: true })
  private async derivedSongs(@Root() song: Song): Promise<Song[] | null> {
    return song.$get("derivedSongs");
  }

  @FieldResolver((type) => [Album], { nullable: true })
  private async albums(@Root() song: Song): Promise<Album[] | null> {
    return song.$get("albums");
  }

  @FieldResolver((type) => [Artist], { nullable: true })
  private async artists(@Root() song: Song): Promise<Artist[] | null> {
    return song.$get("artists");
  }

  @FieldResolver((type) => [MusicFile], { nullable: true })
  private async files(@Root() song: Song): Promise<MusicFile[] | null> {
    return song.$get("files");
  }

  @FieldResolver((type) => [VideoFile], { nullable: true })
  private async videos(@Root() song: Song): Promise<VideoFile[] | null> {
    return song.$get("videos");
  }

  @Authorized("ADMIN")
  @Mutation((returns) => Song)
  public async newSong(
    @Arg("data")
    {
      name,
      sortOrder,
      coverUrl,
      originalId,
      artistsOfSong,
      songInAlbums,
    }: SongInput
  ): Promise<Song> {
    const id = _.random(-2147483648, -1, false);
    const song = await Song.create({
      id,
      name,
      sortOrder,
      coverUrl,
      originalId,
      incomplete: false,
    });
    await Promise.all(
      artistsOfSong.map((v) =>
        song.$add("artist", v.artistId, {
          through: {
            categories: v.categories,
            artistRoles: v.artistRoles,
            customName: v.customName,
            isSupport: v.isSupport,
          },
        })
      )
    );
    await Promise.all(
      songInAlbums.map((v) =>
        song.$add("albums", v.albumId, {
          through: {
            name: v.name,
            diskNumber: v.diskNumber,
            trackNumber: v.trackNumber,
          },
        })
      )
    );
    return song;
  }

  @Authorized("ADMIN")
  @Mutation((returns) => Song)
  public async updateSong(
    @Arg("id", (type) => Int) id: number,
    @Arg("data")
    {
      name,
      sortOrder,
      coverUrl,
      originalId,
      artistsOfSong,
      songInAlbums,
    }: SongInput
  ): Promise<Song> {
    const song = await Song.findByPk(id);
    if (song === null) {
      throw new Error(`Song entity with id ${id} is not found.`);
    }

    await song.update({
      id,
      name,
      sortOrder,
      coverUrl,
      originalId,
    });

    await song.$set(
      "artists",
      artistsOfSong.map((v) => {
        const inst = Artist.build(
          {
            id: v.artistId,
          },
          { isNewRecord: false }
        );
        inst.ArtistOfSong = {
          categories: v.categories,
          artistRoles: v.artistRoles,
          customName: v.customName,
          isSupport: v.isSupport,
        };
        return inst;
      })
    );

    await song.$set(
      "albums",
      songInAlbums.map((v) => {
        const inst = Album.build(
          {
            id: v.albumId,
          },
          { isNewRecord: false }
        );
        inst.SongInAlbum = {
          name: v.name,
          diskNumber: v.diskNumber,
          trackNumber: v.trackNumber,
        };
        return inst;
      })
    );

    return song;
  }
}
