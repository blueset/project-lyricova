"use client";

import { gql, useQuery } from "@apollo/client";
import { SongFragments } from "../../../../../graphql/fragments";
import { Song } from "lyricova-common/models/Song";
import SongEntityDialog from "../../../../../components/dashboard/musicFilesDetails/songEntityDialog";
import { useCallback } from "react";
import { useRouter } from "next/navigation";

const SONG_ENTITY_QUERY = gql`
  query($id: Int!) {
    song(id: $id) {
      ...SelectSongEntry
    }
  }

  ${SongFragments.SelectSongEntry}
`;

export default function SongEntitySingle({
  params: { songId },
}: {
  params: { songId: string };
}) {
  const router = useRouter();
  const id = parseInt(songId as string);
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
