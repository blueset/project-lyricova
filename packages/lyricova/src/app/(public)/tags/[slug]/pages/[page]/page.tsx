import { Metadata } from "next";
import { TagArchivePageComponent, generateMetadataData } from "../../common";
import { permanentRedirect } from "next/navigation";

interface TagArchivePageProps {
  params: Promise<{
    slug: string;
    page: string;
  }>;
}

export async function generateMetadata({
  params,
}: TagArchivePageProps): Promise<Metadata> {
  const { slug, page } = await params;
  return generateMetadataData(slug, page);
}

export default async function TagArchivePage({ params }: TagArchivePageProps) {
  const { slug, page } = await params;
  if (page === "1") {
    permanentRedirect(`/tags/${slug}`);
  }

  return <TagArchivePageComponent tagSlug={slug} page={page} />;
}
