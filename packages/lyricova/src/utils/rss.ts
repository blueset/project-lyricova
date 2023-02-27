import RSS from "rss";
import { EntryResolver } from "../graphql/EntryResolver";
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

  const entryResolver = new EntryResolver();
  const entries = (await entryResolver.entries()).slice(0, 20);
  entries.forEach((entry) => {
    const mainVerse = entry.verses.filter((v) => v.isMain)[0];
    const date = new Date(
      Math.max(
        entry.creationDate.valueOf(),
        ...entry.pulses.map((p) => p.creationDate.valueOf())
      )
    );
    feed.item({
      title: entry.title,
      description: (
        mainVerse.html ||
        mainVerse.stylizedText ||
        mainVerse.text
      ).replace(/\n/g, "<br />"),
      date,
      url: `${host}/entry/${entry.id}`,
      categories: entry.tags.map((t) => t.name),
    });
  });

  return feed.xml();
}
