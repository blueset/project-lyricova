import { getLayout } from "../../../components/dashboard/layouts/AlbumInfoLayout";
import { gql, useQuery } from "@apollo/client";
import { AlbumFragments } from "../../../graphql/fragments";
import { Album } from "../../../models/Album";
import { useRouter } from "next/router";
import AlbumEntityDialog from "../../../components/dashboard/musicFilesDetails/albumEntityDialog";
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
  const id = parseInt(router.query.albumId as string);
  const toggleOpen = useCallback(() => {
    router.push("/dashboard/albums");
  }, [router]);

  const query = useQuery<{ album?: Album }>(ALBUM_ENTITY_QUERY, { variables: { id } });
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
      albumToEdit={query.data?.album} />
  );
}

AlbumEntitySingle.layout = getLayout;
