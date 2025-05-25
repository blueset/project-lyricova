"use client";

import type { ReactNode } from "react";
import React from "react";
import { gql, useApolloClient, useQuery } from "@apollo/client";
import {
  Alert,
  AlertDescription,
} from "@lyricova/components/components/ui/alert";
import type { Song } from "@lyricova/api/graphql/types";
import { useRouter } from "next/navigation";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lyricova/components/components/ui/avatar";
import { Button } from "@lyricova/components/components/ui/button";
import { DataTable } from "@lyricova/components";
import { formatArtistsPlainText } from "@lyricova/components";
import { Edit, ExternalLink, Download } from "lucide-react";
import { DataTableColumnHeader } from "@lyricova/components";
import type { ColumnDef } from "@tanstack/react-table";
import { NavHeader } from "../NavHeader";
import { Badge } from "@lyricova/components/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lyricova/components/components/ui/tooltip";

const SONG_INFO_LIST_QUERY = gql`
  query {
    songs {
      id
      utaiteDbId
      name
      sortOrder
      artists {
        id
        name
        ArtistOfSong {
          categories
          artistRoles
        }
      }
      incomplete
      coverUrl
    }
  }
`;

const SONG_OVERWRITE_MUTATION = gql`
  mutation ($id: Int!) {
    enrolSongFromVocaDB(songId: $id) {
      id
      name
      sortOrder
      artists {
        id
        name
        ArtistOfSong {
          categories
        }
      }
      incomplete
      coverUrl
    }
  }
`;

interface Props {
  children: ReactNode;
}

type SongTableData = {
  id: number;
  utaiteDbId?: number;
  name: string;
  sortOrder: string;
  artists: Song["artists"];
  incomplete: boolean;
  coverUrl: string;
};

export default function SongInfoLayout({ children }: Props) {
  const router = useRouter();
  const apolloClient = useApolloClient();
  const query = useQuery<{ songs: Song[] }>(SONG_INFO_LIST_QUERY);

  const columns: ColumnDef<SongTableData>[] = [
    {
      id: "id",
      accessorKey: "id",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="ID" />
      ),
      cell: ({ row }) => row.getValue("id"),
      meta: {
        width: "max-content",
      },
    },
    {
      id: "name",
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Song" />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-4">
          <Avatar className="h-10 w-10 rounded-md border-border border">
            <AvatarImage
              src={row.original.coverUrl as string}
              alt={row.getValue("name") as string}
            />
            <AvatarFallback className="rounded-md">
              {(row.getValue("name") as string)[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <div>{row.getValue("name")}</div>
            <div className="text-sm text-muted-foreground">
              {row.original.sortOrder}
            </div>
          </div>
        </div>
      ),
      meta: {
        width: "2fr",
      },
    },
    {
      id: "artists",
      accessorKey: "artists",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Artists" />
      ),
      cell: ({ row }) => formatArtistsPlainText(row.original.artists),
      meta: {
        width: "2fr",
      },
    },
    {
      id: "incomplete",
      accessorKey: "incomplete",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) =>
        row.original.incomplete ? (
          <Badge variant="outline">Incomplete</Badge>
        ) : (
          <Badge variant="successOutline">Complete</Badge>
        ),
      meta: {
        width: "max-content",
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const songId = row.getValue("id") as number;
        const isValidId = songId > 0;
        const utaiteDbId = row.original.utaiteDbId;

        const handleOverwrite = async () => {
          const result = await apolloClient.mutate<{
            enrolSongFromVocaDB: Song;
          }>({
            mutation: SONG_OVERWRITE_MUTATION,
            variables: { id: songId },
          });
          if (result.data?.enrolSongFromVocaDB) {
            const updated = result.data.enrolSongFromVocaDB;
            query.updateQuery((prev) => ({
              songs: prev.songs.map((v: Song) =>
                v.id === updated.id ? updated : v
              ),
            }));
          }
        };

        return (
          <div className="flex">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => router.push(`/dashboard/songs/${songId}`)}
                >
                  <Edit />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Edit Song</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  asChild
                  variant="ghost"
                  size="icon"
                  disabled={!isValidId}
                >
                  <a
                    href={`https://vocadb.net/S/${songId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-teal-300"
                  >
                    <ExternalLink />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>View on VocaDB</p>
              </TooltipContent>
            </Tooltip>
            {!!utaiteDbId && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    asChild
                    variant="ghost"
                    size="icon"
                    disabled={!isValidId}
                  >
                    <a
                      href={`https://utaitedb.net/S/${utaiteDbId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-pink-300"
                    >
                      <ExternalLink />
                    </a>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>View on UtaiteDB</p>
                </TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={!isValidId}
                  onClick={handleOverwrite}
                >
                  <Download />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Overwrite from VocaDB</p>
              </TooltipContent>
            </Tooltip>
          </div>
        );
      },
      meta: {
        width: "max-content",
      },
    },
  ];

  let table: ReactNode = null;
  if (query.loading) {
    table = (
      <Alert>
        <AlertDescription>Loading...</AlertDescription>
      </Alert>
    );
  } else if (query.error) {
    table = (
      <Alert variant="error">
        <AlertDescription>Error: {`${query.error}`}</AlertDescription>
      </Alert>
    );
  } else if (query.data) {
    const rows = query.data.songs.map((v) => ({
      id: v.id,
      utaiteDbId: v.utaiteDbId,
      name: v.name,
      sortOrder: v.sortOrder,
      artists: v.artists,
      incomplete: v.incomplete,
      coverUrl: v.coverUrl,
    }));
    table = (
      <DataTable
        data={rows}
        columns={columns}
        controls={
          <div className="text-sm text-muted-foreground">
            {rows.length} song entities.
          </div>
        }
      />
    );
  }

  return (
    <>
      <NavHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          {
            label: `Songs (${query.data?.songs.length ?? "..."})`,
          },
        ]}
      />
      <div className="h-full mx-4 flex flex-col gap-4 mb-2">{table}</div>
      {children}
    </>
  );
}
