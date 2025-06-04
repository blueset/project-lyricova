"use client";

import { useParams } from "next/navigation";
import { gql, useQuery } from "@apollo/client";
import {
  AlbumFragments,
  MusicFileFragments,
  formatArtists,
  Link,
  useAuthContext,
  NextComposedLink,
} from "@lyricova/components";
import React, { Fragment } from "react";
import type { Album } from "@lyricova/api/graphql/types";
import _ from "lodash";
import filesize from "filesize";
import type { Song } from "@lyricova/api/graphql/types";
import type { MusicFile } from "@lyricova/api/graphql/types";
import type { DocumentNode } from "graphql";
import { useAppDispatch } from "@/redux/public/store";
import { loadTracks, playTrack, toggleShuffle } from "@/redux/public/playlist";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@lyricova/components/components/ui/alert";
import { Avatar, AvatarImage } from "@lyricova/components/components/ui/avatar";
import { Button } from "@lyricova/components/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@lyricova/components/components/ui/dropdown-menu";
import {
  ChevronLeft,
  Play,
  Shuffle,
  TextSearch,
  MoreVertical,
} from "lucide-react";

import TrackListRow from "@/components/public/library/TrackListRow";
import { Skeleton } from "@lyricova/components/components/ui/skeleton";

const ALBUM_QUERY = gql`
  query ($id: Int!) {
    album(id: $id) {
      files {
        ...MusicFileForPlaylistAttributes
        duration
        fileSize
        songId
      }
      ...FullAlbumEntry
    }
  }

  ${AlbumFragments.FullAlbumEntry}
  ${MusicFileFragments.MusicFileForPlaylistAttributes}
` as DocumentNode;

type ConvertedTrack = Song & {
  foundFile: MusicFile | null;
};

export default function LibrarySingleAlbum() {
  const { user } = useAuthContext();
  const { albumId: albumIdString } = useParams<{ albumId: string }>();
  const albumId = albumIdString ? parseInt(albumIdString as string) : null;
  const dispatch = useAppDispatch();

  const query = useQuery<{ album: Album }>(ALBUM_QUERY, {
    variables: { id: albumId },
  });

  if (query.loading)
    return (
      <div className="p-4 mt-2 grid grid-cols-1 @3xl/details:grid-cols-[1fr_2fr] gap-6">
        <div>
          <Skeleton className="rounded-md w-full h-auto aspect-square max-w-72 @3xl/details:max-w-none" />
          <Skeleton className="h-4 w-48 mt-2" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-6 w-64" />
          <div className="flex-grow flex flex-wrap gap-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
          </div>

          {[...Array(10)].map((_, index) => (
            <div className="flex justify-between items-center my-6" key={index}>
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </div>
      </div>
    );

  if (query.error)
    return (
      <Alert variant="error" className="m-4 w-auto">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{`${query.error}`}</AlertDescription>
      </Alert>
    );

  const album = query.data.album;
  const trackCount = album.files.length;
  const totalMinutes = Math.round(_.sumBy(album.files, "duration") / 60);
  const totalSize = _.sumBy(album.files, "fileSize");
  const canPlay = trackCount > 0;

  const convertedTracks = _.sortBy(
    album.songs.map(
      (v) =>
        ({
          ...v,
          foundFile: album.files.find((f) => f.songId === v.id) ?? null,
        } as ConvertedTrack)
    ),
    (v) => v.SongInAlbum.diskNumber,
    (v) => v.SongInAlbum.trackNumber
  );

  // Load tracks into playlist in order
  const sortedFiles = convertedTracks
    .filter((v) => v.foundFile)
    .map((v) => v.foundFile);

  const diskSeparatedTracked: (ConvertedTrack | number | null)[] = [];

  for (const i of convertedTracks) {
    if (
      diskSeparatedTracked.length < 1 ||
      (diskSeparatedTracked[diskSeparatedTracked.length - 1] as ConvertedTrack)
        .SongInAlbum?.diskNumber != i.SongInAlbum.diskNumber
    ) {
      diskSeparatedTracked.push(i.SongInAlbum.diskNumber);
    }
    diskSeparatedTracked.push(i);
  }

  const playAll = () => {
    dispatch(loadTracks(sortedFiles));
    dispatch(playTrack({ track: 0, playNow: true }));
  };
  const shuffleAll = () => {
    dispatch(loadTracks(sortedFiles));
    dispatch(toggleShuffle());
    dispatch(playTrack({ track: 0, playNow: true }));
  };

  return (
    <div className="p-4">
      <Button variant="outline" size="sm" asChild>
        <NextComposedLink href="/library/albums">
          <ChevronLeft />
          Albums
        </NextComposedLink>
      </Button>

      <div className="mt-2 grid grid-cols-1 @3xl/details:grid-cols-[1fr_2fr] gap-6">
        <div>
          <div className="md:sticky md:top-2 space-y-2">
            {album.coverUrl && (
              <Avatar className="h-auto rounded-md w-full overflow-hidden">
                <AvatarImage
                  src={album.coverUrl}
                  className="w-full h-auto object-cover aspect-square rounded-md max-w-72 @3xl/details:max-w-none"
                />
              </Avatar>
            )}
            <p className="text-sm text-muted-foreground">
              {trackCount} {trackCount < 2 ? "song" : "songs"}, {totalMinutes}{" "}
              {totalMinutes < 2 ? "minute" : "minutes"}, {filesize(totalSize)}
            </p>
          </div>
        </div>

        <div>
          <div>
            <h1 className="text-2xl font-semibold" lang="ja">
              {album.name}
            </h1>
            <h2 className="text-lg text-muted-foreground" lang="ja">
              {formatArtists(album.artists, (v, isProd) =>
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

            <div className="flex items-center gap-2 mt-2">
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
                {album.id >= 0 && (
                  <Button variant="outline" size="sm" asChild>
                    <NextComposedLink
                      href={`https://vocadb.net/Al/${album.id}`}
                      target="_blank"
                    >
                      <TextSearch />
                      VocaDB
                    </NextComposedLink>
                  </Button>
                )}
                {!!album.utaiteDbId && (
                  <Button variant="outline" size="sm" asChild>
                    <NextComposedLink
                      href={`https://utaitedb.net/Al/${album.utaiteDbId}`}
                      target="_blank"
                    >
                      <TextSearch />
                      UtaiteDB
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
                    <NextComposedLink href={`/dashboard/albums/${album.id}`}>
                      Edit album entity
                    </NextComposedLink>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="mt-4">
            {diskSeparatedTracked.map((v, idx) => {
              if (v === null) {
                return (
                  <div
                    className="py-2 font-medium uppercase tracking-wide text-xs text-muted-foreground"
                    key="unknownDisc"
                  >
                    Unknown disc
                  </div>
                );
              } else if (typeof v === "number") {
                return (
                  <div
                    className="py-2 font-medium uppercase tracking-wide text-xs text-muted-foreground"
                    key={`disc${v}`}
                  >
                    Disc {v}
                  </div>
                );
              } else {
                return (
                  <TrackListRow
                    key={idx}
                    song={v}
                    file={v.foundFile}
                    files={album.files}
                  />
                );
              }
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
