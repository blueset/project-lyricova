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
class ArtistOfAlbumInput implements Partial<ArtistOfAlbum> {
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
class SongInAlbumOnAlbumInput implements Partial<SongInAlbum> {
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
class AlbumInput implements Partial<Album> {
  @Field()
  name: string;

  @Field()
  sortOrder: string;

  @Field({nullable: true})
  coverUrl: string;

  @Field(type => [SongInAlbumOnAlbumInput])
  songsInAlbum: SongInAlbumOnAlbumInput[];

  @Field(type => [ArtistOfAlbumInput])
  artistsOfAlbum: ArtistOfAlbumInput[];
}

@Resolver(of => Album)
export class AlbumResolver {
  @Query(returns => Album, { nullable: true })
  public async album(@Arg("id", type => Int) id: number): Promise<Album | null> {
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
  }: AlbumInput): Promise<Album> {
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

  @Authorized("ADMIN")
  @Mutation(type => Album)
  public async updateAlbum(
    @Arg("id", type => Int) id: number,
    @Arg("data") {
      name, sortOrder, coverUrl, artistsOfAlbum, songsInAlbum
    }: AlbumInput
  ): Promise<Album> {

    const album = await Album.findByPk(id);
    if (album === null) {
      throw new Error(`Album entity with id ${id} is not found.`);
    }

    await album.update({
      id, name, sortOrder, coverUrl,
    });

    await album.$set("artists", artistsOfAlbum.map(v => {
      const inst = Artist.build({
        id: v.artistId,
      }, { isNewRecord: false });
      inst.ArtistOfAlbum = {
        categories: v.categories,
        roles: v.roles,
        effectiveRoles: v.effectiveRoles,
      };
      return inst;
    }));

    await album.$set("songs", songsInAlbum.map(v => {
      const inst = Song.build({
        id: v.songId,
      }, { isNewRecord: false });
      inst.SongInAlbum = {
        name: v.name,
        diskNumber: v.diskNumber,
        trackNumber: v.trackNumber,
      };
      return inst;
    }));

    return album;
  }
}