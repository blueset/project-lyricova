import { Entry } from "lyricova-common/models/Entry";
import RSS from "rss";
import { host, siteName, tagLine1, tagLine2 } from "./consts";

export default async function generateRssFeed() {
  const feedOptions = {
    title: siteName,
    description: `${tagLine1} ${tagLine2}}`,
    site_url: host,
    feed_url: `${host}/rss.xml`,
    image_url: `${host}/logo.png`,
    pubDate: new Date(),
    copyright: `All rights reserved © ${new Date().getFullYear()}`,
  };
  const feed = new RSS(feedOptions);

  const entries = await Entry.findAll({
    include: ["verses", "tags"],
    order: [["recentActionDate", "DESC"]],
    limit: 20,
  });
  entries.forEach((entry) => {
    const mainVerse = entry.verses.filter((v) => v.isMain)[0];
    feed.item({
      title: entry.title,
      description:
        `<img src="${host}/api/og/${entry.id}" alt="${entry.title}" />` +
        (mainVerse.html || mainVerse.stylizedText || mainVerse.text).replace(
          /\n/g,
          "<br />"
        ),
      date: entry.recentActionDate,
      url: `${host}/entry/${entry.id}`,
      categories: entry.tags?.map((t) => t.name) ?? [],
    });
  });

  return feed.xml();
}
