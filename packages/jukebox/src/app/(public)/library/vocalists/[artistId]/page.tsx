import ArtistDetails from "../../../../../components/public/library/ArtistDetails";

export default function VocalistDetails({
  params: { artistId },
}: {
  params: { artistId: string };
}) {
  return <ArtistDetails id={parseInt(artistId)} type="vocalists" />;
}
