import { Entry } from "lyricova-common/models/Entry";
import { buildAnimationSequence } from "lyricova-common/utils/typingSequence";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { PlainTextHangingPunct } from "../PlainTextHangingPunct";
import { TagRow } from "../TagRow";
import { PulseStatus } from "./PulseStatus";
import classes from "./TopEntry.module.scss";
import gsap from "gsap";
import { TextPlugin } from "gsap/dist/TextPlugin";

gsap.registerPlugin(TextPlugin);

interface TopEntryProps {
  entry: Entry;
}

export function TopEntry({ entry }: TopEntryProps) {
  const mainVerse = entry.verses.find((verse) => verse.isMain);
  const otherVerses = entry.verses.filter((verse) => !verse.isMain);
  const artistString = !entry.producersName
    ? entry.vocalistsName
    : !entry.vocalistsName
    ? entry.producersName
    : `${entry.producersName} feat. ${entry.vocalistsName}`;

  const verseRef = useRef<HTMLDivElement>(null);
  const entryRef = useRef<HTMLAnchorElement>(null);
  const timelineRef = useRef<gsap.core.Timeline>();

  const resizeVerse = useCallback((elm: HTMLDivElement) => {
    const containerWidth = elm.parentElement.scrollWidth;
    const fontSize = parseInt(window.getComputedStyle(elm).fontSize);
    let scaledSize =
      Math.round(((containerWidth * 0.6) / elm.scrollWidth) * fontSize * 100) /
      100;
    scaledSize = (scaledSize * 100) / containerWidth;
    elm.style.fontSize = `clamp(1.75rem, ${scaledSize}vw, 5rem)`;
  }, []);

  useEffect(() => {
    const verseRefEl = verseRef.current;
    if (verseRefEl) {
      resizeVerse(verseRefEl);
      // const resizeObserver = new ResizeObserver((entries) => {
      //   resizeVerse(verseRefEl);
      // });
      // resizeObserver.observe(document.body);
      // return () => {
      //   resizeObserver.disconnect();
      // };
    }
  }, [resizeVerse, verseRef]);

  useLayoutEffect(() => {
    const tl = gsap.timeline();
    const verseRefEl = verseRef.current;
    const stepDuration = 1 / 40;
    if (!verseRefEl) {
      return;
    }
    const sequence = mainVerse.typingSequence.map((i) =>
      buildAnimationSequence(i, mainVerse.language)
    );
    let i = 0;
    for (let lineIdx = 0; lineIdx < sequence.length; lineIdx++) {
      const line = sequence[lineIdx];
      let committed = "";
      const lineEl = verseRefEl.querySelector(`[data-line="${lineIdx}"]`);
      if (!lineEl) continue;
      const outcomeEl = lineEl.querySelector(".outcome");
      const typingEl = lineEl.querySelector(".typing");
      const committedEl = lineEl.querySelector(".committed");
      tl.set(outcomeEl, { opacity: 0 }, 0);
      tl.set(typingEl, { text: "" }, 0);
      tl.set(committedEl, { text: "" }, 0);
      if (!outcomeEl || !typingEl || !committedEl) continue;
      for (const step of line) {
        if (step.convert) {
          for (const frame of step.sequence.slice(0, -1)) {
            tl.set(typingEl, { text: frame }, i * stepDuration);
            i++;
          }
          committed += step.sequence[step.sequence.length - 1];
          tl.set(committedEl, { text: committed }, i * stepDuration);
          tl.set(typingEl, { text: "" }, i * stepDuration);
          i++;
        } else {
          for (const frame of step.sequence) {
            tl.set(committedEl, { text: committed + frame }, i * stepDuration);
            i++;
          }
          committed += step.sequence[step.sequence.length - 1];
        }
      }
      tl.set(outcomeEl, { opacity: 1 }, i * stepDuration);
      tl.set(committedEl, { text: "" }, i * stepDuration);
      tl.set(typingEl, { text: "" }, i * stepDuration);
      i++;
    }
    timelineRef.current = tl;
  }, [mainVerse.typingSequence, mainVerse.language]);

  useLayoutEffect(() => {
    const entryRefEl = entryRef.current;
    if (entryRefEl) {
      const onEnter = () => {
        console.log("onEnter", timelineRef.current);
        timelineRef.current?.restart();
      };
      const onLeave = () => {
        console.log("onLeave");
        timelineRef.current?.pause(timelineRef.current?.endTime());
      };
      entryRefEl.addEventListener("mouseenter", onEnter);
      entryRefEl.addEventListener("mouseleave", onLeave);
      return () => {
        entryRefEl.removeEventListener("mouseenter", onEnter);
        entryRefEl.removeEventListener("mouseleave", onLeave);
      };
    }
  }, [timelineRef, entryRef]);

  return (
    <Link
      href={`/entries/${entry.id}`}
      className={`container verticalPadding ${classes.container}`}
      ref={entryRef}
    >
      <div className={classes.otherVerses}>
        {otherVerses.map((verse) => (
          <div key={verse.id} lang={verse.language}>
            <PlainTextHangingPunct>{verse.text}</PlainTextHangingPunct>
          </div>
        ))}
      </div>
      <TagRow tags={entry.tags} />
      <div className={classes.verse} ref={verseRef} lang={mainVerse.language}>
        {mainVerse.text.split("\n").map((line, i) => (
          <div key={i} data-line={i} className={classes.verseLine}>
            <span className="outcome">
              <PlainTextHangingPunct>{line}</PlainTextHangingPunct>
            </span>
            <span className={classes.animation}>
              <span className={`committed ${classes.committed}`}></span>
              <span className={`typing ${classes.typing}`}></span>
            </span>
          </div>
        ))}
      </div>
      <div className={classes.meta}>
        <div className={classes.title}>{entry.title}</div>
        <div className={classes.artists}>{artistString}</div>
      </div>
      <div className={classes.pulse}>
        <PulseStatus entry={entry} />
      </div>
      {/* <img src="/images/arrow.svg" className={classes.arrow} aria-hidden /> */}
      <svg
        width="82"
        height="315"
        viewBox="0 0 82 315"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={classes.arrow}
      >
        <path
          d="M0 273.909L2.09091 271.818L39.2727 309.091V0H42.1818V309.091L79.4545 271.818L81.4545 273.909L40.7273 314.636L0 273.909Z"
          fill="currentcolor"
        />
      </svg>
    </Link>
  );
}
