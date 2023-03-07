import sequelize from "lyricova-common/db";
import { Entry } from "lyricova-common/models/Entry";
import { GetStaticProps, GetStaticPaths, GetServerSideProps } from "next";
import { Fragment } from "react";
import { Divider } from "../../components/public/Divider";
import { Footer } from "../../components/public/Footer";
import { ArchiveHeader } from "../../components/public/listing/ArchiveHeader";
import { Paginator } from "../../components/public/listing/Paginator";
import { SingleEntry } from "../../components/public/listing/SingleEntry";
import { SubArchiveHeader } from "../../components/public/listing/SubArchiveHeader";
import { entriesPerPage } from "../../utils/consts";

export const getStaticProps: GetStaticProps = async (context) => {
  const page = parseInt(context.params.page as string);
  const totalEntries = await sequelize.models.Entry.count();
  const entries = (await sequelize.models.Entry.findAll({
    include: [
      "verses",
      "tags",
      {
        association: "pulses",
        attributes: ["creationDate"],
      },
    ],
    order: [["recentActionDate", "DESC"]],
    limit: entriesPerPage,
    offset: (page - 1) * entriesPerPage,
  })) as Entry[];

  return {
    props: {
      entries: entries.map((entry) => entry.toJSON() as Entry),
      page,
      totalPages: Math.ceil(totalEntries / entriesPerPage),
    },
  };
};

export const getStaticPaths: GetStaticPaths = async () => {
  const totalEntries = await sequelize.models.Entry.count();
  const totalPages = Math.ceil(totalEntries / entriesPerPage);
  const paths = [...Array(totalPages - 1)].map((_, idx) => ({
    params: { page: (idx + 2).toString() },
  }));
  return {
    paths,
    fallback: "blocking",
  };
};

interface ArchivePageProps {
  entries: Entry[];
  page: number;
  totalPages: number;
}

export default function ArchivePage({
  entries,
  page,
  totalPages,
}: ArchivePageProps) {
  return (
    <>
      <ArchiveHeader page={page} />
      <Divider />
      {entries?.map((entry, idx) => (
        <Fragment key={idx}>
          <SingleEntry entry={entry} />
          <Divider />
        </Fragment>
      ))}
      <Paginator currentPage={page} totalPages={totalPages} prefix="/" />
      <Footer />
    </>
  );
}
