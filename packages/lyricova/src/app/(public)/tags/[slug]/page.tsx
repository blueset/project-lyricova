import { Metadata } from "next";
import { TagArchivePageComponent, generateMetadataData } from "./common";

interface TagArchivePageProps {
  params: Promise<{
    tagSlug: string;
  }>;
}

export async function generateMetadata({
  params,
}: TagArchivePageProps): Promise<Metadata> {
  const { tagSlug } = await params;
  return generateMetadataData(tagSlug, "1");
}

export default async function TagArchivePage({ params }: TagArchivePageProps) {
  const { tagSlug } = await params;
  return <TagArchivePageComponent tagSlug={tagSlug} page="1" />;
}
