"use client";

import MusicFileDetails from "@/components/dashboard/MusicFileDetails";
import { useParams } from "next/navigation";

export default function ReviewFile() {
  const { fileId: fileIdString } = useParams<{ fileId: string }>();
  const fileId = parseInt(fileIdString as string);

  return <MusicFileDetails fileId={fileId} />;
}
