"use client";

import { gql, useQuery } from "@apollo/client";
import { useParams } from "next/navigation";
import {
  MusicFileFragments,
  SongFragments,
  formatArtists,
  Link,
  NextComposedLink,
  useAuthContext,
} from "@lyricova/components";
import React, { Fragment } from "react";
import _ from "lodash";
import filesize from "filesize";
import type { Song } from "@lyricova/api/graphql/types";
import type { MusicFile } from "@lyricova/api/graphql/types";
import type { DocumentNode } from "graphql";
import { useAppDispatch } from "@/redux/public/store";
import { loadTracks, playTrack, toggleShuffle } from "@/redux/public/playlist";
import TrackListRow from "@/components/public/library/TrackListRow";
import {
  Alert,
  AlertDescription,
} from "@lyricova/components/components/ui/alert";
import { Avatar, AvatarImage } from "@lyricova/components/components/ui/avatar";
import { Button } from "@lyricova/components/components/ui/button";
import {
  Play,
  Shuffle,
  TextSearch,
  MoreVertical,
  AlertCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@lyricova/components/components/ui/dropdown-menu";
import { Separator } from "@lyricova/components/components/ui/separator";

const SONG_QUERY = gql`
  query ($id: Int!) {
    song(id: $id) {
      files {
        ...MusicFileForPlaylistAttributes
        duration
        fileSize
        songId
      }
      ...SelectSongEntry
    }
  }

  ${SongFragments.SelectSongEntry}
  ${MusicFileFragments.MusicFileForPlaylistAttributes}
` as DocumentNode;

export default function LibrarySingleSong() {
  const { user } = useAuthContext();
  const { songId: songIdString } = useParams<{ songId: string }>();
  const songId = parseInt(songIdString as string);
  const dispatch = useAppDispatch();

  const query = useQuery<{ song: Song }>(SONG_QUERY, {
    variables: { id: songId },
  });

  if (query.loading)
    return (
      <Alert>
        <AlertDescription>Loading...</AlertDescription>
      </Alert>
    );

  if (query.error)
    return (
      <Alert variant="destructive">
        <AlertCircle />
        <AlertDescription>Error: {`${query.error}`}</AlertDescription>
      </Alert>
    );

  if (!query.data?.song)
    return (
      <Alert variant="warning">
        <AlertDescription>Song ID {songId} not found</AlertDescription>
      </Alert>
    );

  const song = query.data.song;
  const filesCount = song.files.length;
  const totalMinutes = Math.round(_.sumBy(song.files, "duration") / 60);
  const totalSize = _.sumBy(song.files, "fileSize");
  const canPlay = filesCount > 0;

  const files = song.files;

  const playAll = () => {
    dispatch(loadTracks(files));
    dispatch(playTrack({ track: 0, playNow: true }));
  };
  const shuffleAll = () => {
    dispatch(loadTracks(files));
    dispatch(toggleShuffle());
    dispatch(playTrack({ track: 0, playNow: true }));
  };

  return (
    <div className="p-4">
      <div className="mt-2 grid grid-cols-1 @3xl/details:grid-cols-[1fr_2fr] gap-6">
        <div>
          <div className="md:sticky md:top-2 mb-4">
            {song.coverUrl && (
              <Avatar className="h-auto rounded-md w-full overflow-hidden">
                <AvatarImage
                  src={song.coverUrl}
                  className="w-full h-auto object-cover aspect-square rounded-md max-w-72 @3xl/details:max-w-none"
                />
              </Avatar>
            )}
          </div>
        </div>
        <div>
          <div className="ml-2">
            <h1 className="text-2xl font-semibold" lang="ja">
              {song.name}
            </h1>
            <h2 className="text-lg text-muted-foreground" lang="ja">
              {formatArtists(song.artists, (v, isProd) =>
                v.map((artist, idx) => (
                  <Fragment key={artist.id}>
                    {idx > 0 && ", "}
                    <Link
                      href={`/library/${isProd ? "producers" : "vocalists"}/${
                        artist.id
                      }`}
                    >
                      {artist.name}
                    </Link>
                  </Fragment>
                ))
              )}
            </h2>
            <div className="flex items-center mt-2">
              <div className="flex-grow flex flex-wrap gap-2">
                {canPlay && (
                  <Button variant="outline" size="sm" onClick={playAll}>
                    <Play />
                    Play
                  </Button>
                )}
                {canPlay && (
                  <Button variant="outline" size="sm" onClick={shuffleAll}>
                    <Shuffle />
                    Shuffle
                  </Button>
                )}
                {song.id >= 0 && (
                  <Button variant="outline" size="sm" asChild>
                    <NextComposedLink
                      href={`https://vocadb.net/S/${song.id}`}
                      target="_blank"
                    >
                      <TextSearch />
                      VocaDB
                    </NextComposedLink>
                  </Button>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild disabled={!user}>
                    <NextComposedLink href={`/dashboard/songs/${song.id}`}>
                      Edit song entity
                    </NextComposedLink>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="mt-4">
            <div className="py-2 uppercase tracking-wider font-medium text-xs text-muted-foreground mt-4">
              {filesCount} {filesCount < 2 ? "file" : "files"}, {totalMinutes}{" "}
              {totalMinutes < 2 ? "minute" : "minutes"}, {filesize(totalSize)}
            </div>

            {files.map((v) => (
              <TrackListRow
                key={v.id}
                song={song}
                file={v}
                files={files}
                showAlbum
              />
            ))}

            {song.albums.length > 0 && (
              <>
                <div className="py-2 uppercase tracking-wider font-medium text-xs text-muted-foreground mt-4">
                  {song.albums.length}{" "}
                  {song.albums.length < 2 ? "album" : "albums"}
                </div>

                {song.albums.map((v) => (
                  <Fragment key={v.id}>
                    <Button
                      variant="ghost"
                      className="w-full justify-start p-2 h-auto"
                      asChild
                    >
                      <NextComposedLink href={`/library/albums/${v.id}`}>
                        <div className="flex items-center w-full">
                          {!!v.coverUrl && (
                            <Avatar className="mr-2 h-10 w-10 rounded-md">
                              <AvatarImage src={v.coverUrl} />
                            </Avatar>
                          )}
                          <div className={!v.coverUrl ? "ml-12" : ""}>
                            <div>{v.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {[
                                v.SongInAlbum.diskNumber
                                  ? `Disk ${v.SongInAlbum.diskNumber}`
                                  : "",
                                v.SongInAlbum.trackNumber
                                  ? `Track ${v.SongInAlbum.trackNumber}`
                                  : "",
                              ]
                                .filter(Boolean)
                                .join(", ") || "Unknown disk"}
                            </div>
                          </div>
                        </div>
                      </NextComposedLink>
                    </Button>
                    <Separator />
                  </Fragment>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
