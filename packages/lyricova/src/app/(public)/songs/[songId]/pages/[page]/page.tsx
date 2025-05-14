import { Metadata } from "next";
import { SongArchivePageComponent, generateMetadataData } from "../../common";
import { permanentRedirect } from "next/navigation";

interface SongArchivePageProps {
  params: Promise<{
    songId: string;
    page: string;
  }>;
}

export async function generateMetadata({
  params,
}: SongArchivePageProps): Promise<Metadata> {
  const { songId, page } = await params;
  return generateMetadataData(songId, page);
}

export default async function SongArchivePage({
  params,
}: SongArchivePageProps) {
  const { songId, page } = await params;

  if (page === "1") {
    permanentRedirect(`/tags/${songId}`);
  }
  return <SongArchivePageComponent songId={songId} page={page} />;
}
