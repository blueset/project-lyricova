import sequelize from "lyricova-common/db";
import { Entry } from "lyricova-common/models/Entry";
import { GetStaticProps } from "next";
import React, { Fragment } from "react";
import { Divider } from "../components/public/Divider";
import { Footer } from "../components/public/Footer";
import { IndexHeader } from "../components/public/IndexHeader";
import { Paginator } from "../components/public/listing/Paginator";
import { SingleEntry } from "../components/public/listing/SingleEntry";
import { TopEntry } from "../components/public/listing/TopEntry";
import { entriesPerPage } from "../utils/consts";

interface IndexProps {
  entries: Entry[];
  totalPages: number;
}

export const getStaticProps: GetStaticProps<IndexProps> = async (context) => {
  let entries = (await sequelize.models.Entry.findAll({
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
  })) as Entry[];
  entries = entries.map((entry) => entry.toJSON() as Entry);
  const totalEntries = await sequelize.models.Entry.count();
  return {
    props: {
      entries,
      totalPages: Math.ceil(totalEntries / entriesPerPage),
    },
  };
};

export default function Index({ entries, totalPages }: IndexProps) {
  return (
    <>
      <IndexHeader />
      <Divider />
      {entries?.map((entry, idx) => (
        <Fragment key={idx}>
          {idx === 0 ? (
            <TopEntry entry={entry} />
          ) : (
            <SingleEntry entry={entry} />
          )}
          <Divider />
        </Fragment>
      ))}
      <Paginator currentPage={1} totalPages={totalPages} prefix="/" />
      <Footer />
    </>
  );
}
