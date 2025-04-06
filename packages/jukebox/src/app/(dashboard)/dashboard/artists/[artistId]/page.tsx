"use client";

import { gql, useQuery } from "@apollo/client";
import type { Artist } from "@lyricova/api/graphql/types";
import { useRouter, useParams } from "next/navigation";
import { ArtistFragments, ArtistEntityDialog } from "@lyricova/components";
import { useCallback } from "react";

const ARTIST_ENTITY_QUERY = gql`
  query ($id: Int!) {
    artist(id: $id) {
      ...SelectArtistEntry
    }
  }

  ${ArtistFragments.SelectArtistEntry}
`;

export default function ArtistEntitySingle() {
  const router = useRouter();
  const { artistId: artistIdString } = useParams<{ artistId: string }>();
  const id = parseInt(artistIdString as string);
  const toggleOpen = useCallback(() => {
    router.push("/dashboard/artists");
  }, [router]);

  const query = useQuery<{ artist?: Artist }>(ARTIST_ENTITY_QUERY, {
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
      artistToEdit={query.data?.artist}
    />
  );
}
