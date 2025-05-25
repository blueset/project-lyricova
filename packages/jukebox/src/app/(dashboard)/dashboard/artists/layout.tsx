"use client";

import type { ReactNode } from "react";
import React from "react";
import { gql, useApolloClient, useQuery } from "@apollo/client";
import {
  Alert,
  AlertDescription,
} from "@lyricova/components/components/ui/alert";
import type { Artist } from "@lyricova/api/graphql/types";
import { useRouter } from "next/navigation";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lyricova/components/components/ui/avatar";
import { Button } from "@lyricova/components/components/ui/button";
import { DataTable } from "@lyricova/components";
import { Pencil, ExternalLink, Download } from "lucide-react";
import { DataTableColumnHeader } from "@lyricova/components";
import type { ColumnDef } from "@tanstack/react-table";
import { NavHeader } from "../NavHeader";
import { Badge } from "@lyricova/components/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lyricova/components/components/ui/tooltip";

const ARTIST_INFO_LIST_QUERY = gql`
  query {
    artists {
      id
      utaiteDbId
      name
      sortOrder
      incomplete
      mainPictureUrl
    }
  }
`;

const ARTIST_OVERWRITE_MUTATION = gql`
  mutation ($id: Int!) {
    enrolArtistFromVocaDB(artistId: $id) {
      id
      name
      sortOrder
      incomplete
      mainPictureUrl
    }
  }
`;

interface Props {
  children: ReactNode;
}

type ArtistTableData = {
  id: number;
  utaiteDbId?: number;
  name: string;
  sortOrder: string;
  incomplete: boolean;
  mainPictureUrl: string;
};

export default function ArtistInfoLayout({ children }: Props) {
  const router = useRouter();
  const apolloClient = useApolloClient();
  const query = useQuery<{ artists: Artist[] }>(ARTIST_INFO_LIST_QUERY);

  const columns: ColumnDef<ArtistTableData>[] = [
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
        <DataTableColumnHeader column={column} title="Artist" />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-4">
          <Avatar className="h-10 w-10 rounded-md border-border border">
            <AvatarImage
              src={row.original.mainPictureUrl}
              className="object-cover object-top"
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
        const artistId = row.getValue("id") as number;
        const isValidId = artistId > 0;
        const utaiteDbId = row.original.utaiteDbId;

        const handleOverwrite = async () => {
          const result = await apolloClient.mutate<{
            enrolArtistFromVocaDB: Artist;
          }>({
            mutation: ARTIST_OVERWRITE_MUTATION,
            variables: { id: artistId },
          });
          if (result.data?.enrolArtistFromVocaDB) {
            const updated = result.data.enrolArtistFromVocaDB;
            query.updateQuery((prev) => ({
              artists: prev.artists.map((v: Artist) =>
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
                  onClick={() => router.push(`/dashboard/artists/${artistId}`)}
                >
                  <Pencil />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Edit Artist</p>
              </TooltipContent>
            </Tooltip>
            {isValidId && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={!isValidId}
                    asChild
                  >
                    <a
                      href={`https://vocadb.net/Ar/${artistId}`}
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
            )}
            {!!utaiteDbId && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" asChild>
                    <a
                      href={`https://utaitedb.net/Ar/${utaiteDbId}`}
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
    const rows = query.data.artists.map((v) => ({
      id: v.id,
      utaiteDbId: v.utaiteDbId,
      name: v.name,
      sortOrder: v.sortOrder,
      incomplete: v.incomplete,
      mainPictureUrl: v.mainPictureUrl,
    }));
    table = (
      <DataTable
        data={rows}
        columns={columns}
        controls={
          <div className="text-sm text-muted-foreground">
            {rows.length} artist entities.
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
            label: `Artists (${query.data?.artists.length ?? "..."})`,
          },
        ]}
      />
      <div className="h-full mx-4 flex flex-col gap-4 mb-2">{table}</div>
      {children}
    </>
  );
}
