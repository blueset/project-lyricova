import { EntryForm } from "@/components/dashboard/EntryForm";

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ entryId: string }>;
}) => {
  const { entryId } = await params;

  return {
    title: `Edit Entry ${entryId} – Entries`,
  };
};

export default async function EntryEdit({
  params,
}: {
  params: Promise<{ entryId: string }>;
}) {
  const { entryId } = await params;

  return <EntryForm id={parseInt(entryId as string)} />;
}
