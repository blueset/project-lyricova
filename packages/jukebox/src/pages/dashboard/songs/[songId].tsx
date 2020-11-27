import { getLayout } from "../../../components/dashboard/layouts/SongInfoLayout";
import { gql, useQuery } from "@apollo/client";
import { SongFragments } from "../../../graphql/fragments";
import { Song } from "../../../models/Song";
import { useRouter } from "next/router";
import SongEntityDialog from "../../../components/dashboard/musicFilesDetails/songEntityDialog";
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
  const id = parseInt(router.query.songId as string);
  const toggleOpen = useCallback(() => {
    router.push("/dashboard/songs");
  }, [router]);

  const query = useQuery<{ song?: Song }>(SONG_ENTITY_QUERY, { variables: { id } });
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
      songToEdit={query.data?.song} />
  );
}

SongEntitySingle.layout = getLayout;
