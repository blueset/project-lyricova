import { Resolver, Query, FieldResolver, Root, Arg, Mutation, InputType, Field } from "type-graphql";
import { Playlist } from "../models/Playlist";
import { MusicFile } from "../models/MusicFile";
import { UserInputError } from "apollo-server-express";
import { GraphQLBoolean } from "graphql";

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

@Resolver(of => Playlist)
export class PlaylistResolver {

  @Query(returns => [Playlist])
  public async playlists(): Promise<Playlist[]> {
    return await Playlist.findAll();
  }

  @Query(returns => Playlist, { nullable: true })
  public async playlist(@Arg("slug") slug: string): Promise<Playlist> {
    return await Playlist.findByPk(slug);
  }

  @Mutation(returns => Playlist)
  public async newPlaylist(@Arg("data") data: NewPlaylistInput): Promise<Playlist> {
    return await Playlist.create(data);
  }

  @Mutation(returns => Playlist)
  public async updatePlaylist(@Arg("slug") slug: string, @Arg("data") data: UpdatePlaylistInput): Promise<Playlist> {
    const playlist = await Playlist.findByPk(slug);
    if (playlist === null) {
      throw new UserInputError(`Playlist with ${slug} is not found in database.`);
    }
    return await playlist.update(data);
  }

  @Mutation(returns => GraphQLBoolean)
  public async removePlaylist(@Arg("slug") slug: string): Promise<boolean> {
    const rowsDeleted = await Playlist.destroy({ where: { slug } });
    return rowsDeleted > 0;
  }

  @FieldResolver(type => [MusicFile])
  public async files(@Root() playlist: Playlist): Promise<MusicFile[]> {
    return await playlist.$get("files");
  }
}