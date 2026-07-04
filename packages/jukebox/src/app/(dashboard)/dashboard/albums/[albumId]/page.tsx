"use client";

import { useQuery } from "@apollo/client";
import { graphql } from "@lyricova/components/gql";
import { useRouter, useParams } from "next/navigation";
import { AlbumEntityDialog } from "@lyricova/components";
import { useCallback } from "react";

const ALBUM_ENTITY_QUERY = graphql(`
  query DashboardAlbumEntity($id: Int!) {
    album(id: $id) {
      ...FullAlbumEntry
    }
  }
`);

export default function AlbumEntitySingle() {
  const router = useRouter();
  const { albumId: albumIdString } = useParams<{ albumId: string }>();
  const id = parseInt(albumIdString as string);
  const toggleOpen = useCallback(() => {
    router.push("/dashboard/albums");
  }, [router]);

  const query = useQuery(ALBUM_ENTITY_QUERY, {
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
      albumToEdit={query.data?.album ?? undefined}
    />
  );
}
