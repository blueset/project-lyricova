"use client";

import type { Tag } from "@lyricova/api/graphql/types";
import React, { useRef } from "react";
import gsap from "gsap";
import { Link } from "@/components/public/Link";
import classes from "./index.module.scss";

export type TagWithCount = Tag & { entryCount: number };

export function TagNode({ tag }: { tag: TagWithCount }) {
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
        ref={(elm) => {
          if (elm) {
            document.fonts.ready
              .then(() => {
                const promises: Promise<any>[] = [];
                document.fonts.forEach(
                  (f) => f.family.match(/Hubot/gi) && promises.push(f.loaded)
                );
                return Promise.all(promises);
              })
              .then(() => {
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
