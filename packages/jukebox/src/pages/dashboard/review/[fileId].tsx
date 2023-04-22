import { getLayout } from "../../../components/dashboard/layouts/ReviewLayout";
import { useRouter } from "next/router";
import MusicFileDetails from "../../../components/dashboard/MusicFileDetails";

export default function ReviewFile() {
  const router = useRouter();
  const fileId = parseInt(router.query.fileId as string);

  return <MusicFileDetails fileId={fileId} />;
}

ReviewFile.layout = getLayout("Review File");
