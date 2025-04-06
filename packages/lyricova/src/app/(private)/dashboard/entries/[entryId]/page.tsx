"use client";

import { useParams } from "next/navigation";
import { EntryForm } from "@/components/dashboard/EntryForm";

export default function EntryEdit() {
  const { entryId } = useParams();

  return <EntryForm id={parseInt(entryId as string)} />;
}
