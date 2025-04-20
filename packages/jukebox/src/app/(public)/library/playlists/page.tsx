"use client";

import { gql, useQuery } from "@apollo/client";
import {
  Alert,
  AlertDescription,
} from "@lyricova/components/components/ui/alert";
import { cn } from "@lyricova/components/utils";
import { NextComposedLink } from "@lyricova/components";
import React from "react";
import type { Playlist } from "@lyricova/api/graphql/types";
import PlaylistAvatar, { gradients } from "@/components/PlaylistAvatar";
import type { DocumentNode } from "graphql";
import { Sparkles, Play, Flame, FilePenLine } from "lucide-react";

const PLAYLISTS_LIST_QUERY = gql`
  query {
    playlists {
      slug
      name
      filesCount
    }
  }
` as DocumentNode;

export default function PlaylistsList() {
  const query = useQuery<{ playlists: Playlist[] }>(PLAYLISTS_LIST_QUERY);

  if (query.loading)
    return (
      <Alert
        variant="info"
        className="bg-blue-50 text-blue-800 border-blue-200"
      >
        <AlertDescription>Loading...</AlertDescription>
      </Alert>
    );

  if (query.error)
    return (
      <Alert variant="error">
        <AlertDescription>Error: {`${query.error}`}</AlertDescription>
      </Alert>
    );

  return (
    <div className="p-4">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(400px,1fr))] gap-2">
        <div className="col-span-full my-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {query.data.playlists.length} curated playlists
          </p>
          <hr className="mt-2" />
        </div>
        {query.data.playlists.map((v) => (
          <NextComposedLink
            key={`playlist-${v.slug}`}
            href={`/library/playlists/${v.slug}`}
            className="col-span-1 -m-2 p-2 flex flex-row items-center text-left hover:bg-accent/50 rounded-md"
          >
            <PlaylistAvatar
              name={v.name}
              slug={v.slug}
              className="mr-4 h-16 w-16 text-2xl"
            />
            <div className="flex-grow overflow-hidden">
              <p className="text-base">{v.name}</p>
              <p className="text-sm text-muted-foreground">
                {v.filesCount} {v.filesCount < 2 ? "file" : "files"}
              </p>
            </div>
          </NextComposedLink>
        ))}
        <div className="col-span-full my-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            4 generated playlists
          </p>
          <hr className="mt-2" />
        </div>

        <NextComposedLink
          href="/library/playlists/new"
          className="-m-2 p-2 flex flex-row items-center text-left hover:bg-accent/50 rounded-md"
        >
          <div
            className="h-16 w-16 mr-4 rounded-md flex items-center justify-center text-2xl text-white"
            style={{
              backgroundImage: `linear-gradient(225deg, ${gradients[1].colors.join(
                ", "
              )})`,
            }}
          >
            <Sparkles />
          </div>
          <div className="flex-grow overflow-hidden">
            <p className="text-base">Recently added</p>
            <p className="text-sm text-muted-foreground">
              Tracks added in 30 days
            </p>
          </div>
        </NextComposedLink>

        <NextComposedLink
          href="/library/playlists/recent"
          className="-m-2 p-2 flex flex-row items-center text-left hover:bg-accent/50 rounded-md"
        >
          <div
            className={cn(
              "h-16 w-16 mr-4 rounded-md flex items-center justify-center text-2xl text-white"
            )}
            style={{
              backgroundImage: `linear-gradient(225deg, ${gradients[2].colors.join(
                ", "
              )})`,
            }}
          >
            <Play />
          </div>
          <div className="flex-grow overflow-hidden">
            <p className="text-base">Recently played</p>
            <p className="text-sm text-muted-foreground">
              Tracks played in 30 days
            </p>
          </div>
        </NextComposedLink>

        <NextComposedLink
          href="/library/playlists/popular"
          className="-m-2 p-2 flex flex-row items-center text-left hover:bg-accent/50 rounded-md"
        >
          <div
            className="h-16 w-16 mr-4 rounded-md flex items-center justify-center text-2xl text-white"
            style={{
              backgroundImage: `linear-gradient(225deg, ${gradients[3].colors.join(
                ", "
              )})`,
            }}
          >
            <Flame />
          </div>
          <div className="flex-grow overflow-hidden">
            <p className="text-base">Most played</p>
            <p className="text-sm text-muted-foreground">Most played tracks</p>
          </div>
        </NextComposedLink>

        <NextComposedLink
          href="/library/playlists/recently-reviewed"
          className="-m-2 p-2 flex flex-row items-center text-left hover:bg-accent/50 rounded-md"
        >
          <div
            className="h-16 w-16 mr-4 rounded-md flex items-center justify-center text-2xl text-white"
            style={{
              backgroundImage: `linear-gradient(225deg, ${gradients[4].colors.join(
                ", "
              )})`,
            }}
          >
            <FilePenLine />
          </div>
          <div className="flex-grow overflow-hidden">
            <p className="text-base">Recently reviewed</p>
            <p className="text-sm text-muted-foreground">
              Tracks reviewed in 30 days
            </p>
          </div>
        </NextComposedLink>
      </div>
    </div>
  );
}
