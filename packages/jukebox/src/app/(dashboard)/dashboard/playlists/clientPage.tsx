"use client";

import { gql, useQuery } from "@apollo/client";
import { Badge } from "@lyricova/components/components/ui/badge";
import { Button } from "@lyricova/components/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@lyricova/components/components/ui/popover";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@lyricova/components/components/ui/alert";
import { Skeleton } from "@lyricova/components/components/ui/skeleton";
import PlaylistAvatar from "@/components/PlaylistAvatar";
import type { ReactNode } from "react";
import { NextComposedLink } from "@lyricova/components";
import _ from "lodash";
import AddPlaylistPopoverContent from "@/components/dashboard/AddPlaylistPopoverContent";
import { CircleX, Plus } from "lucide-react";
import type { DocumentNode } from "graphql";
import { NavHeader } from "../NavHeader";

const PLAYLISTS_QUERY = gql`
  query {
    playlists {
      name
      slug
      filesCount
    }
  }
` as DocumentNode;

export default function PlaylistsPage() {
  const playlistsQuery = useQuery<{
    playlists: {
      name: string;
      slug: string;
      filesCount: number;
    }[];
  }>(PLAYLISTS_QUERY);

  let elements: ReactNode = "";
  if (playlistsQuery.error) {
    elements = (
      <Alert variant="error" className="w-full">
        <CircleX />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{`${playlistsQuery.error}`}</AlertDescription>
      </Alert>
    );
  } else if (playlistsQuery.data) {
    elements = playlistsQuery.data.playlists.map((v) => (
      <NextComposedLink
        key={v.slug}
        data-slot="card"
        href={`/dashboard/playlists/${v.slug}`}
        className="bg-card flex flex-col gap-6 rounded-md border shadow-sm aspect-square relative after:bg-secondary-foreground/5 after:inset-0 after:absolute after:rounded-xl after:transition-opacity after:duration-200 after:ease-in-out after:content-[''] after:block after:opacity-0 hover:after:opacity-100"
      >
        <PlaylistAvatar
          name={v.name}
          slug={v.slug}
          className="absolute w-full h-full text-[5vw]"
        />
        <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-3 text-left rounded-b-md">
          <div className="text-white font-medium">{v.name}</div>
          <div className="text-white/70 text-sm flex justify-between items-center">
            <span>{v.slug}</span>
            <Badge variant="secondary">{v.filesCount}</Badge>
          </div>
        </div>
      </NextComposedLink>
    ));
    console.log("data loaded", elements);
  } else {
    elements = _.range(6).map((v) => (
      <div key={v} className="w-full h-0 pb-[100%] relative">
        <div className="absolute inset-0">
          <Skeleton className="w-full h-full" />
          <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2">
            <Skeleton className="h-5 w-3/4 mb-1" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </div>
    ));
  }

  return (
    <>
      <NavHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          {
            label: `Tags (${playlistsQuery.data?.playlists.length ?? "..."})`,
          },
        ]}
      >
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="secondary" className="w-full">
              <Plus />
              New playlist
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-lg">
            <AddPlaylistPopoverContent
              refresh={playlistsQuery.refetch}
              dismiss={() => {}}
            />
          </PopoverContent>
        </Popover>
      </NavHeader>
      <div className="h-full mx-4 flex flex-col gap-4 mb-2">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
          {elements}
        </div>
      </div>
    </>
  );
}
