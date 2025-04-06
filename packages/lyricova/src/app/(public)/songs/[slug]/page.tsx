import { Metadata } from "next";
import { SongArchivePageComponent, generateMetadataData } from "./common";

interface SongArchivePageProps {
  params: Promise<{
    songId: string;
  }>;
}

export async function generateMetadata({
  params,
}: SongArchivePageProps): Promise<Metadata> {
  const { songId } = await params;
  return generateMetadataData(songId, "1");
}

export default async function SongArchivePage({
  params,
}: SongArchivePageProps) {
  const { songId } = await params;
  return <SongArchivePageComponent songId={songId} page="1" />;
}
