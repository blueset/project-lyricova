import Page from "./clientPage";

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ slug: string }>;
}) => {
  const { slug } = await params;
  return {
    title: `Edit ${slug} – Playlist`,
  };
};

export default Page;
