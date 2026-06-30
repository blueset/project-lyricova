import { Song } from "../models/Song";
import { Arg, Authorized, Int, Mutation, Resolver } from "type-graphql";
import { Artist } from "../models/Artist";
import { Album } from "../models/Album";
import {
  enrolSongFromVocaDB,
  enrolArtistFromVocaDB,
  enrolAlbumFromVocaDB,
  enrolSongFromUtaiteDB,
  enrolArtistFromUtaiteDB,
  enrolAlbumFromUtaiteDB,
} from "../utils/enrol";

@Resolver()
export class VocaDBImportResolver {
  @Authorized("ADMIN")
  @Mutation(() => Song, { description: "Insert or update a song from VocaDB." })
  public async enrolSongFromVocaDB(
    @Arg("songId", () => Int, { description: "Song ID in VocaDB" })
    songId: number
  ): Promise<Song> {
    return enrolSongFromVocaDB(songId);
  }

  @Authorized("ADMIN")
  @Mutation(() => Artist, {
    description: "Insert or update an artist from VocaDB.",
  })
  public async enrolArtistFromVocaDB(
    @Arg("artistId", () => Int, { description: "Artist ID in VocaDB" })
    artistId: number
  ): Promise<Artist> {
    return enrolArtistFromVocaDB(artistId);
  }

  @Authorized("ADMIN")
  @Mutation(() => Album, {
    description: "Insert or update an album from VocaDB.",
  })
  public async enrolAlbumFromVocaDB(
    @Arg("albumId", () => Int, { description: "Album ID in VocaDB" })
    albumId: number
  ): Promise<Album> {
    return enrolAlbumFromVocaDB(albumId);
  }

  @Authorized("ADMIN")
  @Mutation(() => Song, {
    description: "Insert or update a song from UtaiteDB.",
  })
  public async enrolSongFromUtaiteDB(
    @Arg("songId", () => Int, { description: "Song ID in UtaiteDB" })
    songId: number
  ): Promise<Song> {
    return enrolSongFromUtaiteDB(songId);
  }

  @Authorized("ADMIN")
  @Mutation(() => Artist, {
    description: "Insert or update an artist from UtaiteDB.",
  })
  public async enrolArtistFromUtaiteDB(
    @Arg("artistId", () => Int, { description: "Artist ID in UtaiteDB" })
    artistId: number
  ): Promise<Artist> {
    return enrolArtistFromUtaiteDB(artistId);
  }

  @Authorized("ADMIN")
  @Mutation(() => Album, {
    description: "Insert or update an album from UtaiteDB.",
  })
  public async enrolAlbumFromUtaiteDB(
    @Arg("albumId", () => Int, { description: "Album ID in UtaiteDB" })
    albumId: number
  ): Promise<Album> {
    return enrolAlbumFromUtaiteDB(albumId);
  }
}
