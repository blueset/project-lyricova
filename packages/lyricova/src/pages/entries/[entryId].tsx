import sequelize from "lyricova-common/db";
import type { Entry } from "lyricova-common/models/Entry";
import type { GetStaticProps, GetStaticPaths } from "next";
import { useMemo } from "react";
import { Divider } from "../../components/public/Divider";
import { Footer } from "../../components/public/Footer";
import classes from "./EntryPage.module.scss";
import { Comment } from "../../components/public/single/Comment";
import { Pulses } from "../../components/public/single/Pulses";
import { IndexHeader } from "../../components/public/IndexHeader";
import { Songs } from "../../components/public/single/Songs";
import { generateColorGradient } from "../../frontendUtils/colors";
import { OtherVerse } from "../../components/public/single/OtherVerse";
import type { Song } from "lyricova-common/models/Song";
import type { PVContract } from "../../types/vocadb";
import { MainVerse } from "../../components/public/single/MainVerse";
import Head from "next/head";
import { host, siteName } from "../../utils/consts";
import { AdminLinks } from "../../components/public/single/AdminLinks";
import { Gallery } from "../../components/public/single/Gallery";

type ExpandedSong = Song & { videoUrl?: string };
type ExpandedEntry = Entry & { songs: ExpandedSong[] };

export const getStaticProps: GetStaticProps = async (context) => {
  const entryId = parseInt(context.params.entryId as string);
  const entry = (await sequelize.models.Entry.findByPk(entryId, {
    include: [
      {
        association: "verses",
        attributes: {
          exclude: ["creationDate", "updatedOn"],
        },
      },
      {
        association: "tags",
        attributes: ["name", "slug", "color"],
        through: {
          attributes: [],
        },
      },
      {
        association: "songs",
        attributes: ["id", "name", "coverUrl", "vocaDbJson"],
        include: [
          {
            association: "artists",
            attributes: ["id", "name"],
            through: { attributes: ["artistRoles", "categories", "isSupport"] },
          },
        ],
        through: {
          attributes: [],
        },
      },
      {
        association: "pulses",
        attributes: ["creationDate"],
      },
    ],
  })) as Entry;

  if (!entry) return { notFound: true };

  const entryObj = entry.toJSON() as ExpandedEntry;
  entryObj.songs.forEach((song: ExpandedSong) => {
    if (song.vocaDbJson?.pvs) {
      const pvs = song.vocaDbJson.pvs as PVContract[];
      let url: string | undefined = undefined;
      url =
        pvs.find((pv) => pv.service === "Youtube" && pv.pvType === "Original")
          ?.url ??
        pvs.find(
          (pv) => pv.service === "NicoNicoDouga" && pv.pvType === "Original"
        )?.url ??
        pvs.find((pv) => pv.pvType === "Original")?.url ??
        pvs.find((pv) => pv.service === "Youtube")?.url ??
        pvs.find((pv) => pv.service === "NicoNicoDouga")?.url ??
        pvs[0]?.url ??
        undefined;
      song.videoUrl = url;
    }
    delete song.vocaDbJson;
  });

  return {
    props: {
      entry: entryObj,
    },
    revalidate: 10,
  };
};

export const getStaticPaths: GetStaticPaths = async () => {
  const entries = (await sequelize.models.Entry.findAll({
    attributes: ["id"],
  })) as Entry[];
  const paths = entries.map((entry) => ({
    params: { entryId: entry.id.toString() },
  }));
  return {
    paths,
    fallback: "blocking",
  };
};

interface ArchivePageProps {
  entry: ExpandedEntry;
}

export default function EntryPage({ entry }: ArchivePageProps) {
  const otherVerses = entry.verses.filter((verse) => !verse.isMain);
  const verse = entry.verses.find((verse) => verse.isMain);

  const tagsGradient = useMemo(
    () => generateColorGradient(entry.tags),
    [entry.tags]
  );
  const artistString = !entry.producersName
    ? entry.vocalistsName
    : !entry.vocalistsName
    ? entry.producersName
    : `${entry.producersName} feat. ${entry.vocalistsName}`;

  return (
    <>
      <Head>
        <title>{`${entry.title} / ${artistString} – ${siteName}`}</title>
        <meta name="description" content={verse.text} />
        <meta
          name="og:title"
          content={`${entry.title} / ${artistString} – ${siteName}`}
        />
        <meta name="og:description" content={verse.text} />
        <meta name="og:image" content={`${host}/api/og/${entry.id}`} />
      </Head>
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
