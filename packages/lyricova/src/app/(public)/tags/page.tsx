import React from "react";
import { Divider } from "@/components/public/Divider";
import { Footer } from "@/components/public/Footer";
import { IndexHeader } from "@/components/public/IndexHeader";
import classes from "./index.module.scss";
import { apiBaseUrl, host, siteName, tagLine1, tagLine2 } from "@/utils/consts";
import { TagNode, TagWithCount } from "./Tag";

export const metadata = {
  title: "Tags",
  description: `Tags – ${siteName}: ${tagLine1} ${tagLine2}`,
  openGraph: {
    title: `Tags – ${siteName}`,
    description: `Tags – ${siteName}: ${tagLine1} ${tagLine2}`,
    images: [`${host}/images/og-cover.png`],
  },
};

export default async function Tags() {
  const res = await fetch(`${apiBaseUrl}/tags`, { cache: "no-store" });
  const tags: TagWithCount[] = await res.json();

  return (
    <>
      <IndexHeader />
      <Divider />
      <div className={`container verticalPadding ${classes.tags}`}>
        {tags?.map((tag, idx) => (
          <TagNode key={idx} tag={tag} />
        ))}
      </div>
      <Divider />
      <Footer />
      <style>{`
        body {
          display: flex;
          flex-direction: column;
          height: 100%;
        }
      `}</style>
    </>
  );
}
