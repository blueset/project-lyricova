"use client";

import { gql, useQuery } from "@apollo/client";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@lyricova/components/components/ui/alert";
import type {
  MusicFilesPagination,
  MusicFile,
} from "@lyricova/api/graphql/types";
import React, { useCallback, useMemo } from "react";
import { useNamedState } from "@/hooks/useNamedState";
import { DataTableColumnHeader, NextComposedLink } from "@lyricova/components";
import { CircleX } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@lyricova/components/components/ui/button";
import { Badge } from "@lyricova/components/components/ui/badge";
import { DataTable } from "@lyricova/components";
import { NavHeader } from "../NavHeader";
import { Eye, EyeOff, Pencil } from "lucide-react";

const PENDING_REVIEW_FILES_QUERY = gql`
  query {
    musicFiles(first: -1) {
      totalCount
      edges {
        node {
          id
          trackName
          artistName
          albumName
          trackSortOrder
          artistSortOrder
          albumSortOrder
          needReview
        }
      }
    }
  }
`;

const columns: ColumnDef<Partial<MusicFile>>[] = [
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
    id: "trackName",
    accessorKey: "trackName",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Track name" />
    ),
    cell: ({ row }) => row.original.trackName,
    meta: {
      width: "2fr",
    },
  },
  {
    id: "trackSortOrder",
    accessorKey: "trackSortOrder",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Track sort order" />
    ),
    cell: ({ row }) => row.original.trackSortOrder,
    meta: {
      width: "1fr",
    },
  },
  {
    id: "artistName",
    accessorKey: "artistName",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Artist name" />
    ),
    cell: ({ row }) => row.original.artistName,
    meta: {
      width: "1fr",
    },
  },
  {
    id: "artistSortOrder",
    accessorKey: "artistSortOrder",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Artist sort order" />
    ),
    cell: ({ row }) => row.original.artistSortOrder,
    meta: {
      width: "1fr",
    },
  },
  {
    id: "albumName",
    accessorKey: "albumName",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Album name" />
    ),
    cell: ({ row }) => row.original.albumName,
    meta: {
      width: "1fr",
    },
  },
  {
    id: "albumSortOrder",
    accessorKey: "albumSortOrder",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Album sort order" />
    ),
    cell: ({ row }) => row.original.albumSortOrder,
    meta: {
      width: "1fr",
    },
  },
  {
    id: "needReview",
    accessorKey: "needReview",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) =>
      row.original.needReview ? (
        <Badge variant="outline">Pending</Badge>
      ) : (
        <Badge variant="successOutline">Reviewed</Badge>
      ),
    meta: {
      width: "max-content",
    },
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <Button variant="ghost" size="icon" asChild>
        <NextComposedLink href={`/dashboard/review/${row.original.id}`}>
          <Pencil />
        </NextComposedLink>
      </Button>
    ),
    meta: {
      width: "max-content",
    },
  },
];

const columnVisibility = {
  trackSortOrder: false,
  artistSortOrder: false,
  albumSortOrder: false,
};

export default function Review() {
  const needReviewQuery = useQuery<{ musicFiles: MusicFilesPagination }>(
    PENDING_REVIEW_FILES_QUERY
  );

  const totalCount = needReviewQuery.data?.musicFiles.totalCount;
  const needReviewCount = needReviewQuery.data?.musicFiles.edges.filter(
    (v) => v.node.needReview
  ).length;
  const edges = needReviewQuery.data?.musicFiles.edges;

  const [showAll, setShowAll] = useNamedState(false, "showAll");

  const toggleShowAll = useCallback(() => {
    setShowAll(!showAll);
  }, [showAll, setShowAll]);

  const rows = useMemo(
    () =>
      edges
        ?.filter((v) => showAll || v.node.needReview)
        .map((v) => ({ ...v.node })) ?? [],
    [edges, showAll]
  );

  return (
    <>
      <NavHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          {
            label: `Review (${needReviewCount ?? "..."} / ${
              totalCount ?? "..."
            })`,
          },
        ]}
      />
      <div className="h-full mx-4 flex flex-col gap-4 mb-2">
        {needReviewQuery.error && (
          <Alert variant="error">
            <CircleX />
            <AlertTitle>Error occurred while retrieving data.</AlertTitle>
            <AlertDescription>{`${needReviewQuery.error}`}</AlertDescription>
          </Alert>
        )}
        <DataTable
          data={rows}
          columns={columns}
          columnVisibility={columnVisibility}
          controls={
            <Button variant="outline" onClick={toggleShowAll} size="sm">
              {showAll ? (
                <>
                  <Eye />
                  <span className="hidden @3xl/dashboard:inline">
                    {" "}
                    Show all
                  </span>
                </>
              ) : (
                <>
                  <EyeOff />
                  <span className="hidden @3xl/dashboard:inline">
                    {" "}
                    Unreviewed only
                  </span>
                </>
              )}
            </Button>
          }
        />
      </div>
    </>
  );
}
