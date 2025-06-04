"use client";

import { gql, useQuery } from "@apollo/client";
import {
  MusicFileFragments,
  useAuthContext,
  NextComposedLink,
} from "@lyricova/components";
import React from "react";
import type { Artist } from "@lyricova/api/graphql/types";
import _ from "lodash";
import filesize from "filesize";
import type { DocumentNode } from "graphql";
import {
  playTrack,
  toggleShuffle,
  loadTracks,
} from "../../../redux/public/playlist";
import { useAppDispatch } from "../../../redux/public/store";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lyricova/components/components/ui/avatar";
import { Button } from "@lyricova/components/components/ui/button";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@lyricova/components/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@lyricova/components/components/ui/dropdown-menu";
import {
  ChevronLeft,
  MoreVertical,
  Shuffle,
  TextSearch,
  Users,
  Play,
} from "lucide-react";
import TrackListRow from "./TrackListRow";
import { Skeleton } from "@lyricova/components/components/ui/skeleton";

const ARTIST_DETAILS_QUERY = gql`
  query ($id: Int!) {
    artist(id: $id) {
      id
      utaiteDbId
      name
      sortOrder
      type
      mainPictureUrl

      songs {
        id
        name
        sortOrder

        artists {
          id
          name

          ArtistOfSong {
            isSupport
            customName
            artistRoles
            categories
          }
        }

        files {
          ...MusicFileForPlaylistAttributes
          album {
            name
          }
        }
      }
    }
  }

  ${MusicFileFragments.MusicFileForPlaylistAttributes}
` as DocumentNode;

interface Props {
  id: number;
  type: "producers" | "vocalists";
}

export default function ArtistDetails({ id, type }: Props) {
  const { user } = useAuthContext();
  const dispatch = useAppDispatch();

  const query = useQuery<{ artist: Artist }>(ARTIST_DETAILS_QUERY, {
    variables: { id },
  });
  let content;

  if (query.loading)
    content = (
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-18 w-18 rounded-md" />
          <div className="flex-grow min-w-0">
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="space-y-2">
          {[...Array(5)].map((_, index) => (
            <div className="flex justify-between items-center my-6" key={index}>
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </div>
      </div>
    );
  else if (query.error)
    content = (
      <Alert variant="error">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{`${query.error}`}</AlertDescription>
      </Alert>
    );
  else if (query.data.artist === null)
    content = (
      <Alert variant="error">
        <AlertDescription>Error: Artist #{id} was not found.</AlertDescription>
      </Alert>
    );
  else {
    const artist = query.data.artist;
    const files = _.flatMap(artist.songs, (v) => v.files.slice(0, 1));
    const trackCount = files.length;
    const totalMinutes = Math.round(_.sumBy(files, "duration") / 60);
    const totalSize = _.sumBy(files, "fileSize");
    const canPlay = trackCount > 0;

    const playAll = () => {
      dispatch(loadTracks(files));
      dispatch(playTrack({ track: 0, playNow: true }));
    };
    const shuffleAll = () => {
      dispatch(loadTracks(files));
      dispatch(toggleShuffle());
      dispatch(playTrack({ track: 0, playNow: true }));
    };

    content = (
      <>
        <div className="flex flex-col items-start gap-2 @3xl/details:flex-row @3xl/details:justify-between @3xl/details:items-center">
          <div className="flex items-center gap-4">
            <Avatar
              className="h-18 w-18 rounded-md"
              style={{ objectPosition: "top center" }}
            >
              <AvatarImage
                src={artist.mainPictureUrl}
                className="object-top object-cover"
              />
              <AvatarFallback className="rounded-md">
                <Users className="h-8 w-8" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-grow min-w-0">
              <h2 className="text-xl font-semibold" lang="ja">
                {artist.name}
              </h2>
              <p className="text-sm text-muted-foreground" lang="ja">
                {artist.sortOrder}, {artist.type}
                {". "}
                {trackCount} {trackCount < 2 ? "song" : "songs"}, {totalMinutes}{" "}
                {totalMinutes < 2 ? "minute" : "minutes"}, {filesize(totalSize)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
            {artist.id >= 0 && (
              <Button variant="outline" size="sm" asChild>
                <NextComposedLink
                  href={`https://vocadb.net/Ar/${artist.id}`}
                  target="_blank"
                >
                  <TextSearch />
                  VocaDB
                </NextComposedLink>
              </Button>
            )}
            {!!artist.utaiteDbId && (
              <Button variant="outline" size="sm" asChild>
                <NextComposedLink
                  href={`https://utaitedb.net/Ar/${artist.utaiteDbId}`}
                  target="_blank"
                >
                  <TextSearch />
                  UtaiteDB
                </NextComposedLink>
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild disabled={!user}>
                  <NextComposedLink
                    href={`/dashboard/artists/${artist.id}`}
                    target="_blank"
                  >
                    Edit artist entity
                  </NextComposedLink>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="mt-4">
          {_.sortBy(
            artist.songs.filter((v) => v.files.length),
            "sortOrder"
          ).map((v) => (
            <TrackListRow
              song={v}
              file={v.files.length > 0 ? v.files[0] : null}
              files={files}
              key={v.id}
              showAlbum
            />
          ))}
        </div>
      </>
    );
  }

  return (
    <div className="mt-4 mb-2 mx-4 space-y-4">
      <Button variant="outline" size="sm" className="capitalize" asChild>
        <NextComposedLink href={`/library/${type}`}>
          <ChevronLeft />
          {type}
        </NextComposedLink>
      </Button>
      {content}
    </div>
  );
}
