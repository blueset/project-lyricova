import ArtistDetails from "../../../../../components/public/library/ArtistDetails";

export default function ProducerDetails({
  params: { artistId },
}: {
  params: { artistId: string };
}) {
  return <ArtistDetails id={parseInt(artistId)} type="producers" />;
}
