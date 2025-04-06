import { Metadata } from "next";
import { TagArchivePageComponent, generateMetadataData } from "../../common";
import { permanentRedirect } from "next/navigation";

interface TagArchivePageProps {
  params: Promise<{
    tagSlug: string;
    page: string;
  }>;
}

export async function generateMetadata({
  params,
}: TagArchivePageProps): Promise<Metadata> {
  const { tagSlug, page } = await params;
  return generateMetadataData(tagSlug, page);
}

export default async function TagArchivePage({ params }: TagArchivePageProps) {
  const { tagSlug, page } = await params;
  if (page === "1") {
    permanentRedirect(`/tags/${tagSlug}`);
  }

  return <TagArchivePageComponent tagSlug={tagSlug} page={page} />;
}
