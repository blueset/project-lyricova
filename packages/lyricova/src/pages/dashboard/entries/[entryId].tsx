import { Button } from "@mui/material";
import { NextComposedLink } from "lyricova-common/components/Link";
import { useRouter } from "next/router";
import type { ReactNode } from "react";
import { EntryForm } from "../../../components/dashboard/EntryForm";
import { getLayout } from "../../../components/dashboard/layouts/DashboardLayout";

export default function EntryEdit() {
  const router = useRouter();
  const { entryId } = router.query;

  return (
    <>
      <Button
        size="small"
        LinkComponent={NextComposedLink}
        variant="outlined"
        href={`/dashboard/entries/${parseInt(entryId as string) + 1}`}
      >
        Next entry
      </Button>
      <EntryForm id={parseInt(entryId as string)} />
    </>
  );
}

EntryEdit.layout = (page: ReactNode) => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const router = useRouter();
  const { entryId } = router.query;
  return getLayout(`Edit entry ${entryId}`)(page);
};
