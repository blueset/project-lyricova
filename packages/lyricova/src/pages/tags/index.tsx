import { NextComposedLink } from "lyricova-common/components/Link";
import sequelize from "lyricova-common/db";
import { Tag } from "lyricova-common/models/Tag";
import { GetStaticProps } from "next";
import React, { useRef } from "react";
import { Divider } from "../../components/public/Divider";
import { Footer } from "../../components/public/Footer";
import { IndexHeader } from "../../components/public/IndexHeader";
import gsap from "gsap";
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

function TagNode({ tag }: { tag: TagWithCount }) {
  const animationRef = useRef<gsap.core.Tween>(null);
  return (
    <NextComposedLink
      href={`/tags/${tag.slug}`}
      className={classes.tag}
      style={
        {
          "--tag-color": tag.color,
        } as React.CSSProperties
      }
      onMouseEnter={(evt) => {
        const target = evt.currentTarget.querySelector("[data-count]");
        animationRef.current = gsap.from(target, {
          textContent: 0,
          duration: 1.5,
          ease: "power3.out",
          snap: {
            textContent: 1,
          },
        });
      }}
      onMouseLeave={(evt) => {
        animationRef.current?.kill();
        const target = evt.currentTarget.querySelector("[data-count]");
        target.textContent = String(tag.entryCount);
      }}
    >
      <span className={classes.text}>
        {[...tag.name].map((char, idx) => (
          <span key={idx}>{char}</span>
        ))}
      </span>
      <span className={classes.count}>
        ×<span data-count>{tag.entryCount}</span>
      </span>
    </NextComposedLink>
  );
}

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
          <TagNode key={idx} tag={tag} />
        ))}
      </div>
      <Divider />
      <Footer />
    </>
  );
}
