import { Metadata } from "next";
import { TagArchivePageComponent, generateMetadataData } from "./common";

interface TagArchivePageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({
  params,
}: TagArchivePageProps): Promise<Metadata> {
  const { slug } = await params;
  return generateMetadataData(slug, "1");
}

export default async function TagArchivePage({ params }: TagArchivePageProps) {
  const { slug } = await params;
  return <TagArchivePageComponent tagSlug={slug} page="1" />;
}
