import MusicFileDetails from "../../../../../components/dashboard/MusicFileDetails";

export default function ReviewFile({
  params: { fileId: fileIdStr },
}: {
  params: { fileId: string };
}) {
  const fileId = parseInt(fileIdStr);

  return (
    <>
      <MusicFileDetails fileId={fileId} />
    </>
  );
}
