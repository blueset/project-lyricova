import { ReactNode } from "react";
import { EntryForm } from "../../../components/dashboard/EntryForm";
import { getLayout } from "../../../components/dashboard/layouts/DashboardLayout";

export default function EntryEdit() {
  return (
    <>
      <EntryForm />
    </>
  );
}

EntryEdit.layout = (page: ReactNode) => {
  return getLayout("New entry")(page);
};
