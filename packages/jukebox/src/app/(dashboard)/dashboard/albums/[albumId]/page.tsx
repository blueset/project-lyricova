"use client";

import { gql, useQuery } from "@apollo/client";
import { AlbumFragments } from "@lyricova/components";
import type { Album } from "@lyricova/api/graphql/types";
import { useRouter, useParams } from "next/navigation";
import { AlbumEntityDialog } from "@lyricova/components";
import { useCallback } from "react";

const ALBUM_ENTITY_QUERY = gql`
  query ($id: Int!) {
    album(id: $id) {
      ...FullAlbumEntry
    }
  }

  ${AlbumFragments.FullAlbumEntry}
`;

export default function AlbumEntitySingle() {
  const router = useRouter();
  const { albumId: albumIdString } = useParams<{ albumId: string }>();
  const id = parseInt(albumIdString as string);
  const toggleOpen = useCallback(() => {
    router.push("/dashboard/albums");
  }, [router]);

  const query = useQuery<{ album?: Album }>(ALBUM_ENTITY_QUERY, {
    variables: { id },
  });
  let isOpen = false;
  if (query.data?.album) {
    isOpen = true;
  }

  return (
    <AlbumEntityDialog
      isOpen={isOpen}
      toggleOpen={toggleOpen}
      keyword=""
      setKeyword={() => {
        /* No-op. */
      }}
      setAlbum={() => {
        /* No-op. */
      }}
      albumToEdit={query.data?.album}
    />
  );
}
