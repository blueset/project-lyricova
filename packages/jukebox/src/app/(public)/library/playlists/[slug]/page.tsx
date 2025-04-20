"use client";

import { useParams } from "next/navigation";
import {
  useAuthContext,
  MusicFileFragments,
  NextComposedLink,
} from "@lyricova/components";
import { gql, useQuery } from "@apollo/client";
import _ from "lodash";
import filesize from "filesize";
import React from "react";
import type { Playlist } from "@lyricova/api/graphql/types";
import PlaylistAvatar, { gradients, hash } from "@/components/PlaylistAvatar";
import type { DocumentNode } from "graphql";
import { useAppDispatch } from "@/redux/public/store";
import { loadTracks, toggleShuffle } from "@/redux/public/playlist";
import type { MusicFile } from "@lyricova/api/graphql/types";
import { cn } from "@lyricova/components/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@lyricova/components/components/ui/dropdown-menu";
import { Avatar } from "@lyricova/components/components/ui/avatar";
import { Button } from "@lyricova/components/components/ui/button";
import {
  Alert,
  AlertDescription,
} from "@lyricova/components/components/ui/alert";
import TrackListRow from "@/components/public/library/TrackListRow";
import {
  AlertCircle,
  ChevronLeft,
  ExternalLink,
  MoreVertical,
  Pencil,
  PlaySquare,
  Shuffle,
  Sparkles,
  Flame,
  Play,
  FilePenLine,
} from "lucide-react";

const PLAYLIST_DETAILS_QUERY = gql`
  query ($slug: String!) {
    playlist(slug: $slug) {
      slug
      name

      files {
        ...MusicFileForPlaylistAttributes
        FileInPlaylist {
          sortOrder
        }
      }
    }
  }

  ${MusicFileFragments.MusicFileForPlaylistAttributes}
` as DocumentNode;

const NEW_QUERY = gql`
  query {
    newMusicFiles {
      ...MusicFileForPlaylistAttributes
    }
  }

  ${MusicFileFragments.MusicFileForPlaylistAttributes}
` as DocumentNode;

const RECENT_QUERY = gql`
  query {
    recentMusicFiles {
      ...MusicFileForPlaylistAttributes
    }
  }

  ${MusicFileFragments.MusicFileForPlaylistAttributes}
` as DocumentNode;

const POPULAR_QUERY = gql`
  query {
    popularMusicFiles(limit: 100) {
      ...MusicFileForPlaylistAttributes
    }
  }

  ${MusicFileFragments.MusicFileForPlaylistAttributes}
` as DocumentNode;

const RECENTLY_REVIEWED_QUERY = gql`
  query {
    recentlyReviewedMusicFiles {
      ...MusicFileForPlaylistAttributes
    }
  }

  ${MusicFileFragments.MusicFileForPlaylistAttributes}
` as DocumentNode;

export default function PlaylistDetails() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuthContext();
  const dispatch = useAppDispatch();

  const isPredefined =
    slug === "new" ||
    slug === "recent" ||
    slug === "popular" ||
    slug === "recently-reviewed";

  const query = useQuery<{
    playlist?: Playlist;
    newMusicFiles?: MusicFile[];
    recentMusicFiles?: MusicFile[];
    popularMusicFiles?: MusicFile[];
    recentlyReviewedMusicFiles?: MusicFile[];
  }>(
    slug === "new"
      ? NEW_QUERY
      : slug === "recent"
      ? RECENT_QUERY
      : slug === "popular"
      ? POPULAR_QUERY
      : slug === "recently-reviewed"
      ? RECENTLY_REVIEWED_QUERY
      : PLAYLIST_DETAILS_QUERY,
    {
      variables: !isPredefined ? { slug } : undefined,
    }
  );

  let content;

  if (query.loading) content = <Alert>Loading...</Alert>;
  else if (query.error)
    content = (
      <Alert variant="error">
        <AlertCircle />
        <AlertDescription>Error: {`${query.error}`}</AlertDescription>
      </Alert>
    );
  else if (query.data.playlist === null)
    content = (
      <Alert variant="error">
        <AlertCircle />
        <AlertDescription>
          Error: Playlist #{slug} was not found.
        </AlertDescription>
      </Alert>
    );
  else {
    const playlistData = query.data.playlist;
    const files =
      playlistData?.files ??
      query.data.newMusicFiles ??
      query.data.recentMusicFiles ??
      query.data.popularMusicFiles ??
      query.data.recentlyReviewedMusicFiles;
    const trackCount = files.length;
    const totalMinutes = Math.round(_.sumBy(files, "duration") / 60);
    const totalSize = _.sumBy(files, "fileSize");
    const canPlay = trackCount > 0;
    const name =
      slug === "new"
        ? "Recently Added"
        : slug === "recent"
        ? "Recently Played"
        : slug === "popular"
        ? "Most Played"
        : slug === "recently-reviewed"
        ? "Recently Reviewed"
        : playlistData?.name;
    const displaySlug =
      slug === "new"
        ? "Track added in 30 days"
        : slug === "recent"
        ? "Track played in 30 days"
        : slug === "popular"
        ? "Most played tracks"
        : slug === "recently-reviewed"
        ? "Tracks reviewed in 30 days"
        : playlistData?.slug;

    const playAll = () => dispatch(loadTracks(files));
    const shuffleAll = () => {
      playAll();
      dispatch(toggleShuffle());
    };

    content = (
      <>
        <div className="flex items-center">
          {playlistData ? (
            <PlaylistAvatar
              name={name}
              slug={displaySlug}
              className="mr-4 h-24 w-24 text-3xl"
            />
          ) : (
            <Avatar
              className={cn(
                "h-24 w-24 mr-4 text-3xl text-white rounded-md items-center justify-center"
              )}
              style={{
                backgroundImage: `linear-gradient(225deg, ${gradients[
                  slug === "new"
                    ? 1
                    : slug === "recent"
                    ? 2
                    : slug === "popular"
                    ? 3
                    : slug === "recently-reviewed"
                    ? 4
                    : hash(slug) % gradients.length
                ].colors.join(", ")})`,
              }}
            >
              {slug === "new" ? (
                <Sparkles className="size-10" />
              ) : slug === "recent" ? (
                <Play className="size-10" />
              ) : slug === "popular" ? (
                <Flame className="size-10" />
              ) : slug === "recently-reviewed" ? (
                <FilePenLine className="size-10" />
              ) : null}
            </Avatar>
          )}
          <div className="flex-grow min-w-0">
            <h2 className="text-xl font-semibold">{name}</h2>
            <p className="text-sm text-muted-foreground">
              {displaySlug}: {trackCount} {trackCount < 2 ? "song" : "songs"},{" "}
              {totalMinutes} {totalMinutes < 2 ? "minute" : "minutes"},{" "}
              {filesize(totalSize)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canPlay && (
              <Button variant="outline" size="sm" onClick={playAll}>
                <PlaySquare />
                Play
              </Button>
            )}
            {canPlay && (
              <Button variant="outline" size="sm" onClick={shuffleAll}>
                <Shuffle />
                Shuffle
              </Button>
            )}
            {!isPredefined && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical />
                    <span className="sr-only">More options</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild disabled={!user}>
                    <NextComposedLink
                      href={`/dashboard/playlists/${playlistData.slug}`}
                      target="_blank"
                    >
                      <Pencil />
                      <span>Edit playlist entity</span>
                    </NextComposedLink>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <NextComposedLink
                      href={`/api/playlists/${playlistData.slug}.m3u8`}
                      target="_blank"
                    >
                      <ExternalLink />
                      <span>Download playlist M3U8</span>
                    </NextComposedLink>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
        <div className="mt-4">
          {files.map((v) => (
            <TrackListRow
              song={null}
              file={v}
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
    <div className="mt-2 mb-2 mx-4">
      <Button variant="outline" size="sm" className="my-2" asChild>
        <NextComposedLink href="/library/playlists">
          <ChevronLeft />
          Playlists
        </NextComposedLink>
      </Button>
      {content}
    </div>
  );
}
