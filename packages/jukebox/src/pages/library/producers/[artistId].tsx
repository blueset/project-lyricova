import { useRouter } from "next/router";
import ArtistDetails from "../../../components/public/library/ArtistDetails";
import { getLayout } from "../../../components/public/layouts/LibraryLayout";

export default function ProducerDetails() {
  const router = useRouter();
  const artistId = parseInt(router.query.artistId as string);
  return (
    <ArtistDetails id={artistId} type="producers" />
  );
}

ProducerDetails.layout = getLayout;