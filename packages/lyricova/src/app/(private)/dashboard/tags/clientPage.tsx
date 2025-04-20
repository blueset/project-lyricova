"use client";

import { gql, useQuery, useApolloClient } from "@apollo/client";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@lyricova/components/components/ui/alert";
import { Button } from "@lyricova/components/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@lyricova/components/components/ui/popover";
import { DataTable } from "@lyricova/components";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import type { Tag } from "@lyricova/api/graphql/types";
import { DataTableColumnHeader } from "@lyricova/components";
import { Pencil, Plus, Trash, XCircle } from "lucide-react";
import React from "react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@lyricova/components/components/ui/tooltip";
import { TagFormPopup } from "@/components/dashboard/TagForm";
import { NavHeader } from "../NavHeader";

const TAGS_QUERY = gql`
  query Tags {
    tags {
      color
      name
      slug
      entries {
        id
      }
    }
  }
`;

const DELETE_TAG_MUTATION = gql`
  mutation DeleteTag($slug: String!) {
    deleteTag(slug: $slug)
  }
`;

export default function Tags() {
  const tagsQuery = useQuery<{ tags: Tag[] }>(TAGS_QUERY);
  const apolloClient = useApolloClient();
  const rows = tagsQuery.data?.tags ?? [];

  const handleDelete = async (slug: string) => {
    await apolloClient.mutate({
      mutation: DELETE_TAG_MUTATION,
      variables: {
        slug,
      },
    });
    toast.success("Tag deleted.");
    await tagsQuery.refetch();
  };

  const columns: ColumnDef<Tag>[] = [
    {
      id: "slug",
      accessorKey: "slug",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Slug" />
      ),
    },
    {
      id: "name",
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => (
        <span style={{ color: row.original.color }}>{row.original.name}</span>
      ),
    },
    {
      id: "color",
      accessorKey: "color",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Color" />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4"
            style={{ backgroundColor: row.original.color }}
          />
          <span>{row.original.color}</span>
        </div>
      ),
    },
    {
      id: "entries",
      accessorKey: "entries",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Entries" />
      ),
      cell: ({ row }) => `${row.original.entries.length} entries`,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const tag = row.original;
        return (
          <div className="flex">
            <Tooltip>
              <TooltipTrigger asChild>
                <TagFormPopup
                  key="review"
                  onSubmit={() => tagsQuery.refetch()}
                  slug={tag.slug}
                >
                  <Button variant="ghost" size="icon">
                    <Pencil />
                  </Button>
                </TagFormPopup>
              </TooltipTrigger>
              <TooltipContent>Edit tag</TooltipContent>
            </Tooltip>

            <Popover>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Trash className="text-destructive-foreground" />
                      </Button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Delete tag</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <PopoverContent className="w-80">
                <div className="flex flex-col gap-4">
                  <div className="text-sm font-medium">
                    Delete tag {tag.name}?
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      className="px-3"
                      onClick={() => handleDelete(tag.slug)}
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
            label: `Tags (${tagsQuery.data?.tags.length ?? "..."})`,
          },
        ]}
      />
      <div className="h-full mx-4 flex flex-col gap-4 mb-2">
        {tagsQuery.error && (
          <Alert variant="destructive">
            <XCircle />
            <AlertTitle>Error occurred while retrieving data.</AlertTitle>
            <AlertDescription>{`${tagsQuery.error}`}</AlertDescription>
          </Alert>
        )}
        <DataTable
          data={rows}
          columns={columns}
          controls={
            <TagFormPopup onSubmit={() => tagsQuery.refetch()}>
              <Button variant="outline" size="sm">
                <Plus />
                <span className="hidden @3xl/dashboard:inline">New tag</span>
              </Button>
            </TagFormPopup>
          }
        />
      </div>
    </>
  );
}
