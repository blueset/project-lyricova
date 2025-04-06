"use client";

import { gql, useQuery } from "@apollo/client";
import { SongFragments } from "@lyricova/components";
import type { Song } from "@lyricova/api/graphql/types";
import { useRouter, useParams } from "next/navigation";
import { SongEntityDialog } from "@lyricova/components";
import { useCallback } from "react";

const SONG_ENTITY_QUERY = gql`
  query ($id: Int!) {
    song(id: $id) {
      ...SelectSongEntry
    }
  }

  ${SongFragments.SelectSongEntry}
`;

export default function SongEntitySingle() {
  const router = useRouter();
  const { songId: songIdString } = useParams<{ songId: string }>();
  const id = parseInt(songIdString as string);
  const toggleOpen = useCallback(() => {
    router.push("/dashboard/songs");
  }, [router]);

  const query = useQuery<{ song?: Song }>(SONG_ENTITY_QUERY, {
    variables: { id },
  });
  let isOpen = false;
  if (query.data?.song) {
    isOpen = true;
  }

  return (
    <SongEntityDialog
      isOpen={isOpen}
      toggleOpen={toggleOpen}
      setKeyword={() => {
        /* No-op. */
      }}
      setSong={() => {
        /* No-op. */
      }}
      songToEdit={query.data?.song}
    />
  );
}
