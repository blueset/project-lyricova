import { useRouter } from "next/router";
import { ReactNode } from "react";
import { EntryForm } from "../../../components/dashboard/EntryForm";
import { getLayout } from "../../../components/dashboard/layouts/DashboardLayout";

export default function EntryEdit() {
  const router = useRouter();
  const { entryId } = router.query;

  return <EntryForm id={parseInt(entryId as string)} />;
}

EntryEdit.layout = (page: ReactNode) => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const router = useRouter();
  const { entryId } = router.query;
  return getLayout(`Edit entry ${entryId}`)(page);
};
