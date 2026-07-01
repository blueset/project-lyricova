import { desc, isNull } from "drizzle-orm";
import RSS from "rss";
import { db } from "../drizzle/client";
import { Entries } from "../drizzle/schema";
import { host, siteName, tagLine1, tagLine2 } from "./consts";

export default async function generateRssFeed() {
  const feedOptions = {
    title: siteName,
    description: `${tagLine1} ${tagLine2}}`,
    site_url: host,
    feed_url: `${host}/feed/`,
    image_url: `${host}/logo.png`,
    pubDate: new Date(),
    copyright: `All rights reserved © ${new Date().getFullYear()}`,
  };
  const feed = new RSS(feedOptions);

  const entries = await db.query.Entries.findMany({
    where: isNull(Entries.deletionDate),
    with: {
      verses: {
        where: (v: any, { isNull }: any) => isNull(v.deletionDate),
      },
      tagOfEntries: {
        columns: {},
        with: { tag: true },
      },
    },
    orderBy: (e: any, { desc }: any) => desc(e.recentActionDate),
    limit: 20,
  });
  entries.forEach((entry: any) => {
    const mainVerse = entry.verses.filter((v: any) => v.isMain)[0];
    const tags = (entry.tagOfEntries ?? []).map((t: any) => t.tag);
    feed.item({
      title: entry.title,
      description:
        `<img src="${host}/api/og/${entry.id}" alt="${entry.title}" />` +
        (mainVerse.html || mainVerse.stylizedText || mainVerse.text).replace(
          /\n/g,
          "<br />"
        ),
      date: entry.recentActionDate,
      url: `${host}/entries/${entry.id}`,
      categories: tags?.map((t: any) => t.name) ?? [],
    });
  });

  return feed.xml();
}
