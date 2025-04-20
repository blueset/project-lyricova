import Layout from "./clientLayout";

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ fileId: string }>;
}) => {
  const { fileId } = await params;
  return {
    title: `Edit File #${fileId} – Review`,
  };
};

export default Layout;
