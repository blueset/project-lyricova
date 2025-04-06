import _ from "lodash";
import { host, siteName, tagLine1, tagLine2 } from "@/utils/consts";
import SearchClient from "./client";
import { Suspense } from "react";

export const metadata = {
  title: `Search – ${siteName}`,
  description: `Search – ${siteName}: ${tagLine1} ${tagLine2}`,
  openGraph: {
    title: `Search – ${siteName}`,
    description: `Search – ${siteName}: ${tagLine1} ${tagLine2}`,
    images: [`${host}/images/og-cover.png`],
  },
};

export default function Search() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchClient />
    </Suspense>
  );
}
