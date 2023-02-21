import ReviewLayout from "./ReviewLayout";

export default function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { fileId: string };
}) {
  return <ReviewLayout params={params}>{children}</ReviewLayout>;
}
