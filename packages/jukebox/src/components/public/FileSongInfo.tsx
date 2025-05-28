"use client";

import { gql, useQuery } from "@apollo/client";
import type { MusicFile } from "@lyricova/api/graphql/types";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import React, { useCallback, useMemo } from "react";
import type { Artist } from "@lyricova/api/graphql/types";
import { NextComposedLink } from "@lyricova/components";
import { formatTime } from "../../frontendUtils/strings";
import filesize from "filesize";
import type { DocumentNode } from "graphql";
import { cn } from "@lyricova/components/utils";
import { Avatar, AvatarImage } from "@lyricova/components/components/ui/avatar";
import { Button } from "@lyricova/components/components/ui/button";
import { Separator } from "@lyricova/components/components/ui/separator";
import {
  Alert,
  AlertDescription,
} from "@lyricova/components/components/ui/alert";
import { ArrowLeft, ExternalLink } from "lucide-react";

const SINGLE_FILE_SONG_QUERY = gql`
  query ($id: Int!) {
    musicFile(id: $id) {
      id
      trackName
      trackSortOrder
      artistName
      artistSortOrder
      albumName
      albumSortOrder
      hasCover
      duration
      fileSize

      song {
        id
        utaiteDbId
        name
        artists {
          id
          name
          ArtistOfSong {
            categories
          }
        }
      }

      album {
        id
        name
      }
    }
  }
` as DocumentNode;

interface Props {
  partialFile?: Partial<MusicFile>;
  fileId?: number;
}

export default function FileSongInfo({ partialFile, fileId }: Props) {
  const idToQuery = fileId ?? partialFile?.id;

  const query = useQuery<{ musicFile: MusicFile }>(SINGLE_FILE_SONG_QUERY, {
    variables: { id: idToQuery },
  });

  let banner: ReactNode = null;
  if (query.loading)
    banner = (
      <Alert>
        <AlertDescription>Loading...</AlertDescription>
      </Alert>
    );
  else if (query.error)
    banner = (
      <Alert variant="destructive">
        <AlertDescription>Error: {`${query.error}`}</AlertDescription>
      </Alert>
    );

  const file: Partial<MusicFile> =
    query.data?.musicFile ??
    (fileId == null
      ? partialFile
      : {
          id: fileId,
          trackName: "",
          artistName: "",
          albumName: "",
          hasCover: false,
          fileSize: 0,
          duration: 0,
        });

  const TableRow = useCallback(
    ({ heading, children }: { heading: ReactNode; children: ReactNode }) => (
      <div className="@3xl/details:table-row">
        <div className="@3xl/details:table-cell @3xl/details:pt-4 pb-2 @3xl/details:pb-4 @3xl/details:border-b @3xl/details:border-border min-w-32 w-1/3 max-w-80">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            {heading}
          </span>
        </div>
        <div className="@3xl/details:table-cell @3xl/details:pt-4 pb-2 @3xl/details:pb-4 @3xl/details:border-b @3xl/details:border-border">
          {children}
        </div>
        <Separator className="@3xl/details:hidden" />
      </div>
    ),
    []
  );

  const [producers, vocalists] = useMemo((): [Artist[], Artist[]] => {
    const song = file.song;
    const producers: Artist[] = [],
      vocalists: Artist[] = [];

    if (song?.artists) {
      for (const i of song.artists) {
        const categories = i?.ArtistOfSong?.categories || [
          i.ArtistOfAlbum?.categories,
        ];
        if (
          categories.indexOf("Producer") >= 0 ||
          categories.indexOf("Circle") >= 0
        ) {
          producers.push(i);
        } else if (categories.indexOf("Vocalist") >= 0) {
          vocalists.push(i);
        }
      }
    }

    return [producers, vocalists];
  }, [file.song]);

  const vocaDbId = (file.song?.id ?? 0) > 0 ? file.song.id : null;
  const utaiteDbId = file.song?.utaiteDbId ?? null;

  return (
    <>
      {fileId !== null && (
        <Button variant="outline" className="mb-2" asChild>
          <NextComposedLink href="info">
            <ArrowLeft />
            Now playing
          </NextComposedLink>
        </Button>
      )}
      {banner}
      <div className="grid grid-cols-12 gap-4">
        {file.hasCover && (
          <div className="@3xl/details:col-span-4 col-span-12">
            <div className="@3xl/details:sticky @3xl/details:top-2 mb-4">
              {file.hasCover && (
                <Avatar className="rounded-md mb-2 w-full h-auto">
                  <AvatarImage
                    src={`/api/files/${file.id}/cover`}
                    className="w-full aspect-square object-cover max-w-72 @3xl/details:max-w-none"
                    alt={file.trackName || "Album cover"}
                  />
                </Avatar>
              )}
            </div>
          </div>
        )}
        <div
          className={cn(
            "col-span-12",
            file.hasCover && "@3xl/details:col-span-8"
          )}
        >
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            {fileId == null ? "Now playing" : "File details"}
          </span>
          <h2 className="text-xl font-bold leading-tight">{file.trackName}</h2>
          <h3 className="text-lg leading-tight">{file.artistName}</h3>
          <p className="text-muted-foreground leading-tight">
            {file.albumName}
          </p>

          <div className="mt-4 mb-4 @3xl/details:table w-full @3xl/details:border-collapse @3xl/details:table-fixed">
            {producers.length > 0 && (
              <TableRow heading="Producers">
                <div className="flex flex-wrap gap-6">
                  {producers.map((v) => (
                    <Button
                      variant="ghostBright"
                      size="sm"
                      className="-mx-3 -my-2"
                      key={v.id}
                      asChild
                    >
                      <NextComposedLink href={`/library/producers/${v.id}`}>
                        {v.name}
                      </NextComposedLink>
                    </Button>
                  ))}
                </div>
              </TableRow>
            )}
            {vocalists.length > 0 && (
              <TableRow heading="Vocalists">
                <div className="flex flex-wrap gap-6">
                  {vocalists.map((v) => (
                    <Button
                      variant="ghostBright"
                      size="sm"
                      className="-mx-3 -my-2"
                      key={v.id}
                      asChild
                    >
                      <NextComposedLink href={`/library/vocalists/${v.id}`}>
                        {v.name}
                      </NextComposedLink>
                    </Button>
                  ))}
                </div>
              </TableRow>
            )}
            {file.album && (
              <TableRow heading="Album">
                <Button
                  variant="ghostBright"
                  size="sm"
                  className="-mx-3 -my-2"
                  asChild
                >
                  <NextComposedLink href={`/library/albums/${file.album.id}`}>
                    {file.album.name}
                  </NextComposedLink>
                </Button>
              </TableRow>
            )}
            {file.song && (
              <TableRow heading="Song">
                <Button
                  variant="ghostBright"
                  size="sm"
                  className="-mx-3 -my-2"
                  asChild
                >
                  <NextComposedLink href={`/library/songs/${file.song.id}`}>
                    {file.song.name}
                  </NextComposedLink>
                </Button>
              </TableRow>
            )}
            {file.trackSortOrder && (
              <TableRow heading="Title sort key">
                {file.trackSortOrder}
              </TableRow>
            )}
            {file.artistSortOrder && (
              <TableRow heading="Artist sort key">
                {file.artistSortOrder}
              </TableRow>
            )}
            {file.albumSortOrder && (
              <TableRow heading="Album sort key">
                {file.albumSortOrder}
              </TableRow>
            )}
            <TableRow heading="Duration">{formatTime(file.duration)}</TableRow>
            <TableRow heading="File size">{filesize(file.fileSize)}</TableRow>
            {(vocaDbId || utaiteDbId) && (
              <TableRow heading="External links">
                <div className="flex flex-wrap gap-6">
                  {vocaDbId && (
                    <Button
                      variant="ghostBright"
                      size="sm"
                      className="-mx-3 -my-2"
                      asChild
                    >
                      <NextComposedLink
                        target="_blank"
                        href={`https://vocadb.net/S/${vocaDbId}`}
                      >
                        <ExternalLink />
                        VocaDB
                      </NextComposedLink>
                    </Button>
                  )}
                  {utaiteDbId && (
                    <Button
                      variant="ghostBright"
                      size="sm"
                      className="-mx-3 -my-2"
                      asChild
                    >
                      <NextComposedLink
                        target="_blank"
                        href={`https://utaitedb.net/S/${utaiteDbId}`}
                      >
                        <ExternalLink />
                        UtaiteDB
                      </NextComposedLink>
                    </Button>
                  )}
                </div>
              </TableRow>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
