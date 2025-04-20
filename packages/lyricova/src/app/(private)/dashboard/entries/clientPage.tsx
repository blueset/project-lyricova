"use client";

import { gql, useQuery, useApolloClient } from "@apollo/client";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@lyricova/components/components/ui/alert";
import { Button } from "@lyricova/components/components/ui/button";
import { Badge } from "@lyricova/components/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@lyricova/components/components/ui/popover";
import { DataTable } from "@lyricova/components";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import _ from "lodash";
import type { Entry, Tag, Song, Verse } from "@lyricova/api/graphql/types";
import { DataTableColumnHeader, NextComposedLink } from "@lyricova/components";
import { Pencil, Plus, Trash, SquareArrowUp, XCircle } from "lucide-react";
import React, { useCallback } from "react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@lyricova/components/components/ui/tooltip";
import { NavHeader } from "../NavHeader";
import { formatDistanceToNow } from "date-fns";

const ENTRIES_QUERY = gql`
  query {
    entries {
      id
      title
      producersName
      vocalistsName
      creationDate
      pulses {
        creationDate
      }
      tags {
        name
        slug
        color
      }
      songs {
        name
      }
      verses {
        text
        isMain
      }
    }
  }
`;

const DELETE_ENTRY_MUTATION = gql`
  mutation DeleteEntry($id: Int!) {
    deleteEntry(id: $id)
  }
`;

const BUMP_ENTRY_MUTATION = gql`
  mutation BumpEntry($id: Int!) {
    bumpEntry(id: $id)
  }
`;

export default function Entries() {
  const entriesQuery = useQuery<{ entries: Entry[] }>(ENTRIES_QUERY);
  const apolloClient = useApolloClient();

  const rows =
    entriesQuery.data?.entries.map((e) => ({
      ...e,
      actionDate: new Date(
        Math.max(
          e.creationDate.valueOf(),
          ...e.pulses.map((p) => p.creationDate.valueOf())
        )
      ),
    })) ?? [];

  const handleDelete = useCallback(
    async (id: number) => {
      await apolloClient.mutate({
        mutation: DELETE_ENTRY_MUTATION,
        variables: {
          id,
        },
      });
      toast.success("Entry deleted.");
      await entriesQuery.refetch();
    },
    [apolloClient, entriesQuery]
  );

  const handleBump = useCallback(
    async (id: number) => {
      await apolloClient.mutate({
        mutation: BUMP_ENTRY_MUTATION,
        variables: {
          id,
        },
      });
      toast.success("Entry bumped.");
      await entriesQuery.refetch();
    },
    [apolloClient, entriesQuery]
  );

  const columns: ColumnDef<(typeof rows)[number]>[] = [
    {
      id: "id",
      accessorKey: "id",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="ID" />
      ),
      cell: ({ row }) => row.original.id,
      meta: {
        width: "max-content",
      },
    },
    {
      id: "title",
      accessorKey: "title",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Title" />
      ),
      cell: ({ row }) => row.original.title,
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
      cell: ({ row }) =>
        `${row.original.producersName} feat. ${row.original.vocalistsName}`,
      meta: {
        width: "1fr",
      },
    },
    {
      id: "verses",
      accessorKey: "verses",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Text" />
      ),
      cell: ({ row }) =>
        row.original.verses.filter((v: Verse) => v.isMain)[0].text,
      meta: {
        width: "1fr",
      },
    },
    {
      id: "tags",
      accessorKey: "tags",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Tags" />
      ),
      cell: ({ row }) => (
        <div className="flex gap-1">
          {row.original.tags.map((t: Tag) => (
            <Badge
              key={t.slug}
              variant="outline"
              style={{
                borderColor: t.color,
                color: t.color,
              }}
            >
              {t.name}
            </Badge>
          ))}
        </div>
      ),
      meta: {
        width: "1fr",
      },
    },
    {
      id: "songs",
      accessorKey: "songs",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Songs" />
      ),
      cell: ({ row }) =>
        row.original.songs.map((t: Song) => t.name).join(", ") || <em>None</em>,
      meta: {
        width: "1fr",
      },
    },
    {
      id: "actionDate",
      accessorKey: "actionDate",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Recent action" />
      ),
      cell: ({ row }) =>
        `${formatDistanceToNow(row.original.actionDate.valueOf(), {
          addSuffix: true,
        })} (${row.original.pulses.length} pulses)`,
      meta: {
        width: "1fr",
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const entry = row.original;
        return (
          <div className="flex">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" asChild>
                  <NextComposedLink href={`/dashboard/entries/${entry.id}`}>
                    <Pencil />
                  </NextComposedLink>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit entry</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleBump(entry.id)}
                >
                  <SquareArrowUp />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Bump entry</TooltipContent>
            </Tooltip>

            <Popover>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Trash className=" text-destructive-foreground" />
                      </Button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Delete entry</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <PopoverContent className="w-80">
                <div className="flex flex-col gap-4">
                  <div className="text-sm font-medium">
                    Delete entry #{entry.id} {entry.title}?
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      className="px-3"
                      onClick={() => handleDelete(entry.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        );
      },
      meta: {
        width: "max-content",
      },
    },
  ];

  return (
    <>
      <NavHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          {
            label: `Entires (${entriesQuery.data?.entries.length ?? "..."})`,
          },
        ]}
      />
      <div className="h-full mx-4 flex flex-col gap-4 mb-2">
        {entriesQuery.error && (
          <Alert variant="destructive">
            <XCircle />
            <AlertTitle>Error occurred while retrieving data.</AlertTitle>
            <AlertDescription>{`${entriesQuery.error}`}</AlertDescription>
          </Alert>
        )}
        <DataTable
          data={rows}
          columns={columns}
          columnVisibility={{
            producersName: false,
            vocalistsName: false,
          }}
          controls={
            <Button variant="outline" size="sm" asChild>
              <NextComposedLink href="/dashboard/entries/new">
                <Plus />
                <span className="hidden @3xl/dashboard:inline">New entry</span>
              </NextComposedLink>
            </Button>
          }
        />
      </div>
    </>
  );
}
