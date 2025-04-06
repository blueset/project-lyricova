import { Metadata } from "next";
import { ArtistArchivePageComponent, generateMetadataData } from "../../common";
import { permanentRedirect } from "next/navigation";

interface ArtistArchivePageProps {
  params: Promise<{
    artistId: string;
    page: string;
  }>;
}

export async function generateMetadata({
  params,
}: ArtistArchivePageProps): Promise<Metadata> {
  const { artistId, page } = await params;
  return generateMetadataData(artistId, page);
}

export default async function ArtistArchivePage({
  params,
}: ArtistArchivePageProps) {
  const { artistId, page } = await params;

  if (page === "1") {
    permanentRedirect(`/artists/${artistId}`);
  }

  return <ArtistArchivePageComponent artistId={artistId} page={page} />;
}
