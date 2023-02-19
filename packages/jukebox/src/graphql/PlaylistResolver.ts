import {
  Resolver,
  Query,
  FieldResolver,
  Root,
  Arg,
  Mutation,
  InputType,
  Field,
  Int,
} from "type-graphql";
import { Playlist } from "lyricova-common/models/Playlist";
import { MusicFile } from "lyricova-common/models/MusicFile";
import { UserInputError } from "apollo-server-express";
import { MusicFileResolver } from "./MusicFileResolver";
import pLimit from "p-limit";
import { FileInPlaylist } from "lyricova-common/models/FileInPlaylist";
import Sequelize, { Association } from "sequelize";
import sequelize from "lyricova-common/db";

@InputType()
class NewPlaylistInput implements Partial<Playlist> {
  @Field()
  slug: string;

  @Field()
  name: string;
}

@InputType()
class UpdatePlaylistInput implements Partial<Playlist> {
  @Field({ nullable: true })
  slug: string;

  @Field({ nullable: true })
  name: string;
}

@Resolver((of) => Playlist)
export class PlaylistResolver {
  @Query((returns) => [Playlist])
  public async playlists(): Promise<Playlist[]> {
    return await Playlist.findAll();
  }

  @Query((returns) => Playlist, { nullable: true })
  public async playlist(@Arg("slug") slug: string): Promise<Playlist> {
    return await Playlist.findByPk(slug);
  }

  @Mutation((returns) => Playlist)
  public async newPlaylist(
    @Arg("data") data: NewPlaylistInput
  ): Promise<Playlist> {
    return await Playlist.create(data);
  }

  @Mutation((returns) => Playlist)
  public async updatePlaylist(
    @Arg("slug") slug: string,
    @Arg("data") data: UpdatePlaylistInput
  ): Promise<Playlist> {
    const playlist = await Playlist.findByPk(slug);
    if (playlist === null) {
      throw new UserInputError(
        `Playlist with slug ${slug} is not found in database.`
      );
    }
    await playlist.update(data);
    if (slug !== data.slug) {
      // Update tags of all files
      const files = await playlist.$get("files");
      const limit = pLimit(10);
      await Promise.all(
        files.map((i) => limit(async () => i.updatePlaylistsOfFileAsTags()))
      );
    }
    return playlist;
  }

  @Mutation((returns) => Playlist)
  public async addFileToPlaylist(
    @Arg("slug") slug: string,
    @Arg("fileId", (type) => Int) fileId: number
  ): Promise<Playlist> {
    const playlist = await Playlist.findByPk(slug);
    if (playlist === null) {
      throw new UserInputError(
        `Playlist with slug ${slug} is not found in database.`
      );
    }
    const musicFile = await MusicFile.findByPk(fileId);
    if (musicFile === null) {
      throw new UserInputError(
        `Music file with ID ${fileId} is not found in database.`
      );
    }
    const has = await playlist.$has("file", musicFile);
    if (has)
      throw new UserInputError(
        `Music file ${fileId} is already in playlist ${slug}.`
      );
    const count = await playlist.$count("files");
    await playlist.$add("file", musicFile, { through: { sortOrder: count } });
    await musicFile.updatePlaylistsOfFileAsTags();
    return playlist;
  }

  @Mutation((returns) => Playlist)
  public async removeFileFromPlaylist(
    @Arg("slug") slug: string,
    @Arg("fileId", (type) => Int) fileId: number
  ): Promise<Playlist> {
    const playlist = await Playlist.findByPk(slug);
    if (playlist === null) {
      throw new UserInputError(
        `Playlist with slug ${slug} is not found in database.`
      );
    }
    const musicFile = await MusicFile.findByPk(fileId);
    if (musicFile === null) {
      throw new UserInputError(
        `Music file with ID ${fileId} is not found in database.`
      );
    }
    const has = await playlist.$has("file", musicFile);
    if (!has)
      throw new UserInputError(
        `Music file ${fileId} is not in playlist ${slug}.`
      );
    await playlist.$remove("file", musicFile);
    await musicFile.updatePlaylistsOfFileAsTags();
    return playlist;
  }

  @Mutation((returns) => Playlist)
  public async updatePlaylistSortOrder(
    @Arg("slug") slug: string,
    @Arg("fileIds", (type) => [Int]) fileIds: number[]
  ): Promise<Playlist> {
    const playlist = await Playlist.findByPk(slug);
    if (playlist === null) {
      throw new UserInputError(
        `Playlist with slug ${slug} is not found in database.`
      );
    }
    const dummyFileObjs = fileIds.map((v, idx) => {
      const obj = MusicFile.build({ id: v }, { isNewRecord: false });
      obj.FileInPlaylist = { sortOrder: idx };
      return obj;
    });
    await playlist.$add("files", dummyFileObjs);
    return playlist;
  }

  @Mutation((returns) => Boolean)
  public async removePlaylist(@Arg("slug") slug: string): Promise<boolean> {
    const playlist = await Playlist.findByPk(slug);
    if (playlist === null) {
      return false;
    }
    const files = await playlist.$get("files");

    await playlist.destroy();

    // Update file tags
    const limit = pLimit(10);
    await Promise.all(
      files.map((i) => limit(async () => i.updatePlaylistsOfFileAsTags()))
    );
    return true;
  }

  @Mutation((returns) => Playlist)
  public async updatePlaylistFiles(
    @Arg("slug") slug: string,
    @Arg("fileIds", (type) => [Int]) fileIds: number[]
  ): Promise<Playlist> {
    const playlist = await Playlist.findByPk(slug);
    if (playlist === null) {
      throw new UserInputError(
        `Playlist with slug ${slug} is not found in database.`
      );
    }
    const oldFiles = await playlist.$get("files");
    const fileIdsSet = new Set(fileIds);
    const oldFilesIdSet = new Set(oldFiles.map((v) => v.id));

    const limit = pLimit(10);

    // Remove files
    const toRemoveObjs = await oldFiles.filter((v) => !fileIdsSet.has(v.id));
    await playlist.$remove("files", toRemoveObjs);
    await Promise.all(
      toRemoveObjs.map((i) =>
        limit(async () => i.updatePlaylistsOfFileAsTags())
      )
    );

    // Build dummy items for `add`ing and `update`-ing
    const dummyFileObjs = fileIds.map((v, idx) => {
      const obj = MusicFile.build({ id: v }, { isNewRecord: false });
      obj.FileInPlaylist = { sortOrder: idx };
      return obj;
    });
    // Apply `add`ed and `update`d items in DB
    await playlist.$add("files", dummyFileObjs);

    // Update tags to `add`ed files
    const toAddObjcts = dummyFileObjs.filter((v) => !oldFilesIdSet.has(v.id));
    await Promise.all(
      toAddObjcts.map((i) => limit(async () => i.updatePlaylistsOfFileAsTags()))
    );

    return playlist;
  }

  @FieldResolver((type) => [MusicFile])
  public async files(@Root() playlist: Playlist): Promise<MusicFile[]> {
    return await playlist.$get("files", {
      // FIXME: a dirty hack due to not knowing how to deal with through-table-order-by
      // @see https://stackoverflow.com/questions/64486384/how-to-order-by-a-through-table-column-in-a-sequlize-js-association-query
      order: [Sequelize.literal("FileInPlaylist.sortOrder asc")],
    });
  }

  @FieldResolver((type) => Int)
  public async filesCount(@Root() playlist: Playlist): Promise<number> {
    return await playlist.$count("files");
  }
}
