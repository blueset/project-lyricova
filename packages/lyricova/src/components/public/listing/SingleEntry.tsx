"use client";

import type { Entry } from "@lyricova/api/graphql/types";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { TagRow } from "../TagRow";
import { PulseStatus } from "./PulseStatus";
import gsap from "gsap";
import classes from "./SingleEntry.module.scss";
import { Link } from "../Link";
import { generateColorGradient } from "../../../frontendUtils/colors";

function convertRemToPixels(rem: string) {
  return (
    parseFloat(rem) *
    parseFloat(getComputedStyle(document.documentElement).fontSize)
  );
}

interface SingleEntryProps {
  entry: Entry;
}

export function SingleEntry({ entry }: SingleEntryProps) {
  const mainVerse = entry.verses.find((verse) => verse.isMain);
  const artistString = !entry.producersName
    ? entry.vocalistsName
    : !entry.vocalistsName
    ? entry.producersName
    : `${entry.producersName} feat. ${entry.vocalistsName}`;

  const verseRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLAnchorElement>(null);

  const tagsGradient = useMemo(
    () => generateColorGradient(entry.tags, true),
    [entry.tags]
  );

  const applyMask = useCallback((elm: HTMLElement) => {
    if (elm.scrollWidth > elm.clientWidth) {
      elm.classList.add(classes.mask);
    } else {
      elm.classList.remove(classes.mask);
    }
  }, []);

  useEffect(() => {
    const verseRefEl = verseRef.current;
    if (verseRefEl) {
      applyMask(verseRefEl);
      const resizeObserver = new ResizeObserver((entries) => {
        applyMask(verseRefEl);
      });
      resizeObserver.observe(document.body);
      return () => {
        resizeObserver.disconnect();
      };
    }
  }, [applyMask, verseRef]);

  const mouseMoveCallback = useCallback((e: MouseEvent) => {
    const target = e.currentTarget as HTMLDivElement;
    const cyclingVerse = target.querySelector(
      "[data-cyclingverse]"
    ) as HTMLDivElement;
    const gutter = convertRemToPixels(
      getComputedStyle(target).getPropertyValue("--horizontal-gutter")
    );
    const cycleWidth = cyclingVerse.scrollWidth / 5;
    const ratio = e.clientX / target.clientWidth;
    const start = -(2 * cycleWidth - gutter);
    const end = -(3 * cycleWidth - target.clientWidth + gutter);
    const shift = start + (end - start) * ratio;
    gsap.to(cyclingVerse, {
      x: shift,
      duration: 0.5,
      ease: "power2.out",
    });
  }, []);

  useEffect(() => {
    const containerElm = containerRef.current;
    if (containerElm) {
      mouseMoveCallback({ currentTarget: containerElm, clientX: 0 } as any);
      containerElm.addEventListener("mousemove", mouseMoveCallback);
      return () => {
        containerElm.removeEventListener("mousemove", mouseMoveCallback);
      };
    }
  }, [mouseMoveCallback]);

  const text = mainVerse.text.replace(/\n/g, " ").replace(/　/g, " ");

  return (
    <section
      className={`verticalPadding ${classes.container}`}
      ref={containerRef}
      style={
        {
          "--tags-gradient": tagsGradient,
          "--tags-foreground": entry.tags?.[0]?.color,
        } as CSSProperties
      }
    >
      <div className={`container ${classes.meta}`}>
        <div className={classes.metaLeft}>
          <span className={classes.title}>{entry.title}</span>
          <span className={classes.artists}>{artistString}</span>
        </div>
        <TagRow tags={entry.tags} />
      </div>
      <div className={classes.verseContainer} lang={mainVerse.language}>
        <div className="container">
          <div className={classes.verse} ref={verseRef}>
            {text}
          </div>
        </div>
        <div className={classes.cyclingVerse} data-cyclingverse>
          <span className={classes.cyclingRepeats}>
            {text} {text}
          </span>{" "}
          {text}{" "}
          <span className={classes.cyclingRepeats}>
            {text} {text}
          </span>
        </div>
      </div>
      <Link
        className={`container ${classes.pulse}`}
        href={`/entries/${entry.id}`}
      >
        <PulseStatus entry={entry} />
      </Link>
    </section>
  );
}
