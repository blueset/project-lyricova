import { Arg, Authorized, Field, FieldResolver, Info, InputType, Int, Mutation, Query, Resolver, Root } from "type-graphql";
import { Artist } from "lyricova-common/models/Artist";
import { literal } from "sequelize";
import { Song } from "lyricova-common/models/Song";
import { Album } from "lyricova-common/models/Album";
import { MusicFile } from "lyricova-common/models/MusicFile";
import _ from "lodash";
import { SongInAlbum } from "lyricova-common/models/SongInAlbum";
import type { VDBArtistCategoryType, VDBArtistRoleType } from "../types/vocadb";
import { ArtistOfAlbum } from "lyricova-common/models/ArtistOfAlbum";
import { getFields } from "lyricova-common/utils/graphQL";
import sequelize from "sequelize";
import { FieldNode, GraphQLResolveInfo } from "graphql";


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
  includes(info: GraphQLResolveInfo): string[] {
    const fields = getFields(info);
    return fields.filter(f => f === "songs" || f === "artists" || f === "files");
  }

  @Query(returns => Album, { nullable: true })
  public async album(@Arg("id", type => Int) id: number, @Info() info: GraphQLResolveInfo): Promise<Album | null> {
    return Album.findByPk(id, {include: this.includes(info)});
  }

  @Query(returns => [Album])
  public async albums(@Info() info: GraphQLResolveInfo): Promise<Album[]> {
    return Album.findAll({
      order: ["sortOrder"],
      attributes: { exclude: ["vocaDbJson"] },
      include: this.includes(info),
    });
  }

  @Query(returns => [Album])
  public async albumsHasFiles(@Info() info: GraphQLResolveInfo): Promise<Album[]> {
    return Album.findAll({
      order: ["sortOrder"],
      attributes: [
        "id", "name", "sortOrder", "coverUrl",  "incomplete", "creationDate", "updatedOn", "deletionDate",
      ],
      where: sequelize.literal(`(
        SELECT
          COUNT(MusicFiles.id) 
        FROM SongInAlbums 
        INNER JOIN 
          MusicFiles 
        ON
          SongInAlbums.songId = MusicFiles.songId
        WHERE 
          SongInAlbums.albumId = Album.id and MusicFiles.albumId = Album.id 
      ) > 0`),
      include: this.includes(info),
    });
  }

  @Query(returns => [Album])
  public async searchAlbums(@Arg("keywords") keywords: string, @Info() info: GraphQLResolveInfo): Promise<Album[]> {
    return Album.findAll({
      where: literal("match (name, sortOrder) against (:keywords in boolean mode)"),
      attributes: { exclude: ["vocaDbJson"] },
      replacements: {
        keywords,
      },
      include: this.includes(info),
    });
  }

  @FieldResolver(type => [Song], { nullable: true })
  private async songs(@Root() album: Album): Promise<Song[] | null> {
    return album.$get("songs");
  }

  @FieldResolver(type => [Artist], { nullable: true })
  private async artists(@Root() album: Album): Promise<Artist[] | null> {
    if (album.artists) return album.artists;
    return await album.$get("artists");
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