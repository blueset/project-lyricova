"use client";

import { gql, useQuery } from "@apollo/client";
import React from "react";
import type { Album } from "@lyricova/api/graphql/types";
import { NextComposedLink, formatArtistsPlainText } from "@lyricova/components";
import type { DocumentNode } from "graphql";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@lyricova/components/components/ui/alert";
import { Button } from "@lyricova/components/components/ui/button";
import { cn } from "@lyricova/components/utils";
import { Loader2 } from "lucide-react";

const ALBUMS_QUERY = gql`
  query {
    albumsHasFiles {
      id
      name
      sortOrder
      coverUrl
      artists {
        name
        ArtistOfAlbum {
          categories
        }
      }
    }
  }
` as DocumentNode;

export default function LibraryAlbums() {
  const query = useQuery<{ albumsHasFiles: Album[] }>(ALBUMS_QUERY);

  if (query.loading)
    return (
      <Alert variant="info">
        <Loader2 className="animate-spin" />
        <AlertDescription>Loading...</AlertDescription>
      </Alert>
    );

  if (query.error)
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{`${query.error}`}</AlertDescription>
      </Alert>
    );

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4 p-4">
      {query.data.albumsHasFiles.map((val) => (
        <Button
          key={val.id}
          variant="ghostBright"
          className="w-auto p-2 -m-2 box-content h-auto flex flex-col items-start"
          asChild
        >
          <NextComposedLink
            href={`/library/albums/${val.id}`}
            className="group"
          >
            <img
              src={val.coverUrl || "/images/disk-512.jpg"}
              alt={val.name}
              loading="lazy"
              className={cn(
                "object-cover aspect-square w-full rounded-sm group-hover:brightness-110 transition-filter duration-200"
              )}
            />
            <div className="w-full text-left">
              <p className="text-sm truncate font-medium" lang="ja">
                {val.name}
              </p>
              <p className="text-sm text-muted-foreground truncate" lang="ja">
                {formatArtistsPlainText(val.artists)}
              </p>
            </div>
          </NextComposedLink>
        </Button>
      ))}
    </div>
  );
}
