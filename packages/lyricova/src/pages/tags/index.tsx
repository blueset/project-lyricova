import sequelize from "lyricova-common/db";
import type { Tag } from "lyricova-common/models/Tag";
import type { GetStaticProps } from "next";
import React, { useRef } from "react";
import { Divider } from "../../components/public/Divider";
import { Footer } from "../../components/public/Footer";
import { IndexHeader } from "../../components/public/IndexHeader";
import gsap from "gsap";
import classes from "./index.module.scss";
import { Link } from "../../components/public/Link";
import Head from "next/head";
import { host, siteName, tagLine1, tagLine2 } from "../../utils/consts";

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
    revalidate: 60,
  };
};

function TagNode({ tag }: { tag: TagWithCount }) {
  const animationRef = useRef<gsap.core.Tween>(null);
  return (
    <Link
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
      <span
        className={classes.text}
        ref={async (elm) => {
          if (elm) {
            await document.fonts.ready;
            const promises: Promise<any>[] = [];
            document.fonts.forEach(
              (f) => f.family.match(/Hubot/gi) && promises.push(f.loaded)
            );
            await Promise.all(promises);
            console.log(promises);
            const fontSize = parseFloat(
              window.getComputedStyle(elm).getPropertyValue("font-size")
            );
            const spans = Array.from(elm.querySelectorAll("span"));
            spans.forEach((span) => {
              span.style.display = "inline";
              span.style.marginLeft = "0";
            });
            const offsetLeft = elm.offsetLeft;
            const range = document.createRange();
            range.setStartBefore(spans[0]);
            const lefts = spans.map((span) => {
              range.setEndBefore(span);
              return range.getBoundingClientRect().width + offsetLeft;
            });
            spans.forEach((span, idx) => {
              span.style.display = "inline-block";
              const diff = (lefts[idx] - span.offsetLeft) / fontSize;
              span.style.marginLeft = `${diff}em`;
            });
          }
        }}
      >
        {[...tag.name].map((char, idx) => (
          <span key={idx}>{char}</span>
        ))}
      </span>
      <span className={classes.count}>
        ×<span data-count>{tag.entryCount}</span>
      </span>
    </Link>
  );
}

export default function Tags({ tags }: IndexProps) {
  return (
    <>
      <Head>
        <title>{`Tags – ${siteName}`}</title>
        <meta
          name="description"
          content={`Tags – ${siteName}: ${tagLine1} ${tagLine2}`}
        />
        <meta name="og:title" content={`Tags – ${siteName}`} />
        <meta
          name="og:description"
          content={`Tags – ${siteName}: ${tagLine1} ${tagLine2}`}
        />
        <meta name="og:image" content={`${host}/images/og-cover.png`} />
      </Head>
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
