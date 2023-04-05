import classes from "./docs.module.scss";
import Head from "next/head";
import { NavPanel } from "../../components/public/nav/NavPanel";
import { Footer } from "../../components/public/Footer";
import { Link } from "../../components/public/Link";
import type { GetStaticProps } from "next";
import type { Tag } from "lyricova-common/models/Tag";
import sequelize from "lyricova-common/db";
import { Recursive } from "@next/font/google";
import { Fragment } from "react";

const recursive = Recursive({
  subsets: ["latin"],
  weight: "variable",
  axes: ["CASL", "CRSV", "MONO"],
});

interface ScreensaverDocsProps {
  tags: string[];
}

export const getStaticProps: GetStaticProps<ScreensaverDocsProps> = async (
  context
) => {
  const tags = (await sequelize.models.Tag.findAll({
    attributes: ["slug"],
  })) as Tag[];

  return {
    props: {
      tags: tags.map((tag) => tag.slug),
    },
  };
};

export default function ScreensaverDocs({ tags }: ScreensaverDocsProps) {
  return (
    <div className={`container ${classes.container}`}>
      <div className={classes.top}>
        <div className={classes.title}>
          <h1>
            <Link href="/">
              Project Lyricov<span>a</span>
            </Link>
          </h1>
          <h2>
            <Link href="/screensavers">
              Screen
              <wbr />
              saver<span>s</span>
            </Link>
          </h2>
        </div>
        <NavPanel />
      </div>
      <article>
        <h2>Options</h2>
        <p>
          The following optional arguments can be included in the URL of
          screensaver pages:
        </p>
        <h3>Type</h3>
        <p>
          <code>type</code> is a parameter to decide which type of verses to
          include in the screensaver. Possible values are <code>all</code> which
          shows all verses; <code>main</code> to show only the main verse; and{" "}
          <code>original</code> to only show the original verses.
        </p>
        <p>
          The default value is <code>all</code>.
        </p>
        <h3>Languages</h3>
        <p>
          <code>languages</code> is a comma-separated list of languages of
          verses to show in the screensaver. Languages are matched by prefix.
          For example, <code>zh</code> matches both <code>zh-hans</code> and{" "}
          <code>zh-hant</code>. Omit this to include verses of all languages.
        </p>
        <p>
          Common values include <code>en</code>, <code>ja</code>, and{" "}
          <code>zh</code>.
        </p>
        <h3>Tags</h3>
        <p>
          <code>tags</code> is a comma-separated list of tags of entries to show
          in the screensaver. Tags are matched by their slugs.
        </p>
        <p>
          Possible values are{" "}
          {tags.map((s, idx) => (
            <Fragment key={s}>
              <code>{s}</code>
              {idx + 2 == tags.length
                ? ", and "
                : idx + 1 == tags.length
                ? ""
                : ", "}
            </Fragment>
          ))}
          . By default it includes entries of all tags.
        </p>
      </article>
      <Footer />
      <style jsx global>{`
        code {
          font-family: ${recursive.style.fontFamily};
          font-variation-settings: "CASL" 1;
        }
      `}</style>
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto+Flex:opsz,wdth,wght,XTRA@8..144,150,300..900,600&display=swap"
          rel="stylesheet"
        />
      </Head>
    </div>
  );
}
