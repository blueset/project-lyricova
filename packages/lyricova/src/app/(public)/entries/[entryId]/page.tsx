import type { Metadata } from "next";
import { Divider } from "@/components/public/Divider";
import { Footer } from "@/components/public/Footer";
import classes from "./EntryPage.module.scss";
import { Comment } from "@/components/public/single/Comment";
import { Pulses } from "@/components/public/single/Pulses";
import { IndexHeader } from "@/components/public/IndexHeader";
import { Songs } from "@/components/public/single/Songs";
import { generateColorGradient } from "@/frontendUtils/colors";
import { OtherVerse } from "@/components/public/single/OtherVerse";
import type { Entry, Song } from "@lyricova/api/graphql/types";
import { MainVerse } from "@/components/public/single/MainVerse";
import { apiBaseUrl, host, siteName } from "@/utils/consts";
import { AdminLinks } from "@/components/public/single/AdminLinks";
import { Gallery } from "@/components/public/single/Gallery";

interface EntryPageProps {
  params: Promise<{
    entryId: string;
  }>;
}

type ExpandedSong = Song & { videoUrl?: string };
type ExpandedEntry = Entry & { songs: ExpandedSong[] };

export async function generateMetadata({
  params,
}: EntryPageProps): Promise<Metadata> {
  const { entryId } = await params;
  const response = await fetch(`${apiBaseUrl}/entries/${entryId}`, {
    cache: "no-store",
  });
  const entry = (await response.json()) as ExpandedEntry;

  const artistString = !entry.producersName
    ? entry.vocalistsName
    : !entry.vocalistsName
    ? entry.producersName
    : `${entry.producersName} feat. ${entry.vocalistsName}`;
  const verse = entry.verses.find((verse) => verse.isMain);

  return {
    title: `${entry.title} / ${artistString} – ${siteName}`,
    description: verse.text,
    openGraph: {
      title: `${entry.title} / ${artistString} – ${siteName}`,
      description: verse.text,
      images: [`${host}/api/og/${entry.id}`],
    },
  };
}

export default async function EntryPage({ params }: EntryPageProps) {
  const { entryId } = await params;
  const response = await fetch(`${apiBaseUrl}/entries/${entryId}`, {
    cache: "no-store",
  });
  const entry = (await response.json()) as ExpandedEntry;

  const otherVerses = entry.verses.filter((verse) => !verse.isMain);
  const tagsGradient = generateColorGradient(entry.tags);

  return (
    <>
      <div className={classes.entryId}>
        <span className={classes.entryIdSharp}>#</span>
        <span className={classes.entryIdNumber}>
          {String(entry.id).padStart(3, "0")}
        </span>
      </div>
      <IndexHeader />
      <MainVerse entry={entry} />
      {entry.tags.length ? (
        <div
          className={classes.tagDivider}
          style={{
            background: tagsGradient,
          }}
          aria-hidden
        >
          <span>Hello there! :)</span>
        </div>
      ) : (
        <Divider />
      )}
      {otherVerses.length > 0 && (
        <>
          <section className={classes.otherVerses}>
            {otherVerses.map((verse) => (
              <OtherVerse verse={verse} key={verse.id} />
            ))}
          </section>
          <Divider />
        </>
      )}
      <Pulses pulses={entry.pulses} creationDate={entry.creationDate} />
      <Songs songs={entry.songs} />
      <Comment>{entry.comment}</Comment>
      <Gallery entryIds={entry.songs.map((s) => s.id)} />
      <AdminLinks id={entry.id} />
      <Footer />
    </>
  );
}
