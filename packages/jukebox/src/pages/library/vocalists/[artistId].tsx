import { useRouter } from "next/router";
import ArtistDetails from "../../../components/public/library/ArtistDetails";
import { getLayout } from "../../../components/public/layouts/LibraryLayout";

export default function VocalistDetails() {
  const router = useRouter();
  const artistId = parseInt(router.query.artistId as string);
  return (
    <ArtistDetails id={artistId} type="vocalists" />
  );
}

VocalistDetails.layout = getLayout;