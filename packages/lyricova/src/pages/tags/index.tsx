import { NextComposedLink } from "lyricova-common/components/Link";
import sequelize from "lyricova-common/db";
import { Tag } from "lyricova-common/models/Tag";
import { GetStaticProps } from "next";
import React from "react";
import { Divider } from "../../components/public/Divider";
import { Footer } from "../../components/public/Footer";
import { IndexHeader } from "../../components/public/IndexHeader";
import classes from "./index.module.scss";

type TagWithCount = Tag & { entryCount: number };

interface IndexProps {
  tags: TagWithCount[];
}

export const getStaticProps: GetStaticProps<IndexProps> = async (context) => {
  let tags = (await sequelize.models.Tag.findAll({
    attributes: {
      include: [
        [
          sequelize.literal(
            "(SELECT COUNT(*) FROM TagOfEntries WHERE TagOfEntries.tagId = Tag.slug)"
          ),
          "entryCount",
        ],
      ],
    },
  })) as TagWithCount[];
  tags = tags.map((tag) => tag.toJSON() as TagWithCount);
  return {
    props: {
      tags,
    },
  };
};

export default function Tags({ tags }: IndexProps) {
  return (
    <>
      <style jsx global>{`
        html,
        body {
          height: 100%;
        }
        #__next {
          display: flex;
          flex-direction: column;
          height: 100%;
        }
      `}</style>
      <IndexHeader />
      <Divider />
      <div className={`container verticalPadding ${classes.tags}`}>
        {tags?.map((tag, idx) => (
          <NextComposedLink
            href={`/tags/${tag.slug}`}
            key={idx}
            className={classes.tag}
            style={
              {
                "--tag-color": tag.color,
              } as React.CSSProperties
            }
          >
            <span className={classes.text}>
              {[...tag.name].map((char, idx) => (
                <span key={idx}>{char}</span>
              ))}
            </span>
            <span className={classes.count}>×{tag.entryCount}</span>
          </NextComposedLink>
        ))}
      </div>
      <Divider />
      <Footer />
    </>
  );
}
