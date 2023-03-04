import { Button } from "@mui/material";
import sequelize from "lyricova-common/db";
import { Entry } from "lyricova-common/models/Entry";
import { GetStaticProps } from "next";
import React, { Fragment } from "react";
import { Divider } from "../components/public/Divider";
import { IndexHeader } from "../components/public/IndexHeader";
import { SingleEntry } from "../components/public/listing/SingleEntry";
import { TopEntry } from "../components/public/listing/TopEntry";
import { EntryResolver } from "../graphql/EntryResolver";

interface IndexProps {
  entries: Entry[];
}

export const getStaticProps: GetStaticProps<IndexProps> = async (context) => {
  // const entryResolver = new EntryResolver();
  // const entries = await entryResolver.entries(true);
  // console.log("sequelize.models", sequelize.models);
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
    limit: 10,
  })) as Entry[];
  entries = entries.map((entry) => entry.toJSON() as Entry);
  // const entries = await Entry.findAll({
  //   include: ["verses"],
  //   order: [["recentActionDate", "DESC"]],
  //   raw: true,
  //   limit: 10,
  // });
  return {
    props: {
      entries,
    },
  };
};

export default function Index({ entries }: IndexProps) {
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
    </>
  );
}
