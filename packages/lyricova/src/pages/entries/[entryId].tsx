import sequelize from "lyricova-common/db";
import type { Entry } from "lyricova-common/models/Entry";
import { GetStaticProps, GetStaticPaths, GetServerSideProps } from "next";
import { Fragment } from "react";
import { Divider } from "../../components/public/Divider";
import { Footer } from "../../components/public/Footer";
import { ArchiveHeader } from "../../components/public/listing/ArchiveHeader";
import { Paginator } from "../../components/public/listing/Paginator";
import { SingleEntry } from "../../components/public/listing/SingleEntry";
import { Title } from "../../components/public/nav/Title";
import { entriesPerPage } from "../../utils/consts";

export const getStaticProps: GetStaticProps = async (context) => {
  const entryId = parseInt(context.params.entryId as string);
  const entry = (await sequelize.models.Entry.findByPk(entryId, {
    include: [
      {
        association: "verses",
        attributes: {
          exclude: ["creationDate", "updatedOn", "language"],
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
        attributes: ["id", "name", "coverUrl"],
        include: [
          {
            association: "artists",
            attributes: ["id", "name"],
            through: { attributes: ["artistRoles", "categories"] },
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

  return {
    props: {
      entry: entry.toJSON(),
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
  entry: Entry;
}

export default function ArchivePage({ entry }: ArchivePageProps) {
  return (
    <>
      <Title />#{entry.id}
      <Divider />
      <Footer />
    </>
  );
}
