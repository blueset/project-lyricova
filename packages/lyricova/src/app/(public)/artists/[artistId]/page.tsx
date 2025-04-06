import { Metadata } from "next";
import { ArtistArchivePageComponent, generateMetadataData } from "./common";

interface ArtistArchivePageProps {
  params: Promise<{
    artistId: string;
  }>;
}

export async function generateMetadata({
  params,
}: ArtistArchivePageProps): Promise<Metadata> {
  const { artistId } = await params;
  return generateMetadataData(artistId, "1");
}

export default async function ArtistArchivePage({
  params,
}: ArtistArchivePageProps) {
  const { artistId } = await params;
  return <ArtistArchivePageComponent artistId={artistId} page="1" />;
}
