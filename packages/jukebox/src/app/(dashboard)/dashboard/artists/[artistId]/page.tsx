"use client";

import { useQuery } from "@apollo/client";
import { graphql } from "@lyricova/components/gql";
import { useRouter, useParams } from "next/navigation";
import { ArtistEntityDialog } from "@lyricova/components";
import { useCallback } from "react";

const ARTIST_ENTITY_QUERY = graphql(`
  query DashboardArtistEntity($id: Int!) {
    artist(id: $id) {
      ...SelectArtistEntry
    }
  }
`);

export default function ArtistEntitySingle() {
  const router = useRouter();
  const { artistId: artistIdString } = useParams<{ artistId: string }>();
  const id = parseInt(artistIdString as string);
  const toggleOpen = useCallback(() => {
    router.push("/dashboard/artists");
  }, [router]);

  const query = useQuery(ARTIST_ENTITY_QUERY, {
    variables: { id },
  });
  let isOpen = false;
  if (query.data?.artist) {
    isOpen = true;
  }

  return (
    <ArtistEntityDialog
      isOpen={isOpen}
      toggleOpen={toggleOpen}
      keyword=""
      setKeyword={() => {
        /* No-op. */
      }}
      setArtist={() => {
        /* No-op. */
      }}
      artistToEdit={query.data?.artist ?? undefined}
    />
  );
}
