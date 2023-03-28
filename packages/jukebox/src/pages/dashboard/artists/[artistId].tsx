import { getLayout } from "../../../components/dashboard/layouts/ArtistInfoLayout";
import { gql, useQuery } from "@apollo/client";
import { ArtistFragments } from "lyricova-common/utils/fragments";
import { Artist } from "lyricova-common/models/Artist";
import { useRouter } from "next/router";
import ArtistEntityDialog from "lyricova-common/components/artistEntityDialog";
import { useCallback } from "react";

const ARTIST_ENTITY_QUERY = gql`
  query($id: Int!) {
    artist(id: $id) {
      ...SelectArtistEntry
    }
  }

  ${ArtistFragments.SelectArtistEntry}
`;

export default function ArtistEntitySingle() {
  const router = useRouter();
  const id = parseInt(router.query.artistId as string);
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

ArtistEntitySingle.layout = getLayout;
