import { GetServerSideProps } from "next";
import { ScreensaverProps } from "../../utils/screensaverProps";
import { getServerSideProps as getProps } from "../../utils/screensaverProps";
import classes from "./centered.module.scss";
import gsap from "gsap";
import { TextPlugin } from "gsap/dist/TextPlugin";
import { buildAnimationSequence } from "lyricova-common/utils/typingSequence";
import { PlainTextHangingPunct } from "../../components/public/PlainTextHangingPunct";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  generateColorGradient,
  generateColorGradientSteps,
} from "../../frontendUtils/colors";
import { TagRow } from "../../components/public/TagRow";
import clsx from "clsx";

gsap.registerPlugin(TextPlugin);

export const getServerSideProps: GetServerSideProps<ScreensaverProps> =
  getProps;

export default function TypingCenteredScreensaver({
  entries,
  verses,
}: ScreensaverProps) {
  const [[h, m, s], setTime] = useState(["00", "00", "00"]);

  useEffect(() => {
    const now = new Date();
    setTime([
      now.getHours().toString().padStart(2, "0"),
      now.getMinutes().toString().padStart(2, "0"),
      now.getSeconds().toString().padStart(2, "0"),
    ]);
    const timer = setInterval(() => {
      const now = new Date();
      setTime([
        now.getHours().toString().padStart(2, "0"),
        now.getMinutes().toString().padStart(2, "0"),
        now.getSeconds().toString().padStart(2, "0"),
      ]);
    }, 1000);
    return () => {
      clearInterval(timer);
    };
  }, []);

  const [cursor, setCursor] = useState(0);
  const cursorRef = useRef<number>();
  cursorRef.current = cursor;

  const verse = verses[cursor];
  const entry = entries[verse.entryId];
  const colors = useMemo(
    () => generateColorGradient(entry.tags, false).replace("right", "bottom"),
    [entry]
  );

  const [lines, setLines] = useState<string[]>([]);

  const artistString = !entry.producersName
    ? entry.vocalistsName
    : !entry.vocalistsName
    ? entry.producersName
    : `${entry.producersName} feat. ${entry.vocalistsName}`;

  const timelineRef = useRef<gsap.core.Timeline>();
  const typingLineRef = useRef<HTMLDivElement>();

  const buildTimeline = useCallback(
    (lineEl: HTMLElement, cursor: number) => {
      if (timelineRef.current) {
        timelineRef.current.kill();
      }

      console.log("using cursor", cursor);
      const verse = verses[cursor];
      const verseLines = verse.text.split("\n");

      const tl = gsap.timeline();
      const stepDuration = verse.language.startsWith("ja") ? 1 / 8 : 1 / 10;
      // const stepDuration = verse.language.match(/^(zh|ja)/) ? 1 / 15 : 1 / 30;
      const sequence = verse.typingSequence.map((i) =>
        buildAnimationSequence(i, verse.language)
      );

      const typingEl = lineEl.querySelector(".typing");
      const committedEl = lineEl.querySelector(".committed");

      let i = 0;
      // tl.set(lineEl, { display: "block" }, 0);
      tl.call(
        (el: HTMLElement) => {
          el.classList.remove(classes.hidden);
          el.parentElement.classList.remove(classes.done);
        },
        [lineEl],
        0
      );
      tl.set(typingEl, { text: "" }, 0);
      tl.set(committedEl, { text: "" }, 0);
      for (let lineIdx = 0; lineIdx < sequence.length; lineIdx++) {
        const line = sequence[lineIdx];
        let committed = "";
        if (!typingEl || !committedEl) continue;
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
              tl.set(
                committedEl,
                { text: committed + frame },
                i * stepDuration
              );
              i++;
            }
            committed += step.sequence[step.sequence.length - 1];
          }
        }
        tl.call(
          (lineIdx) => {
            setLines((lines) => [...lines, verseLines[lineIdx]].slice(-50));
          },
          [lineIdx],
          i * stepDuration
        );
        tl.set(committedEl, { text: "" }, i * stepDuration);
        tl.set(typingEl, { text: "" }, i * stepDuration);
        i++;
      }
      // tl.set(lineEl, { display: "none" }, "<");
      tl.call(
        (el: HTMLElement) => {
          el.classList.add(classes.hidden);
          el.parentElement.classList.add(classes.done);
        },
        [lineEl],
        "<"
      );

      if (sequence.length < verseLines.length) {
        tl.call(
          (missingLines: string[]) => {
            setLines((lines) => [...lines, ...missingLines].slice(-50));
          },
          [verseLines.slice(sequence.length)],
          ">"
        );
      }

      tl.call(
        () => {
          const newCursor = (cursor + 1) % verses.length;
          setCursor(newCursor);
          setLines([]);
          tl.kill();
          buildTimeline(lineEl, newCursor);
        },
        [],
        ">+3"
      );
      timelineRef.current = tl;
    },
    [verses]
  );

  useEffect(() => {
    if (typingLineRef.current) {
      buildTimeline(typingLineRef.current, cursorRef.current);
      const scrollerContent = typingLineRef.current.parentElement;
      const scroller = scrollerContent.parentElement;
      // resize observer to keep it at bottom
      const resizeObserver = new ResizeObserver(() => {
        scroller.scrollTop = scroller.scrollHeight;
      });
      resizeObserver.observe(scrollerContent);
      return () => {
        resizeObserver.disconnect();
      };
    }
  }, [buildTimeline]);

  return (
    <>
      <time
        className={classes.time}
        style={{
          [colors.startsWith("linear-gradient")
            ? "backgroundImage"
            : "backgroundColor"]: colors,
        }}
      >
        {h}:{m}:{s}
      </time>
      <section className={classes.container}>
        <article>
          <div className={classes.lines}>
            {lines.map((line, idx) => (
              <div
                className={clsx(classes.line, classes.prevLine)}
                key={idx}
                lang={verse.language}
              >
                <PlainTextHangingPunct>{line}</PlainTextHangingPunct>
              </div>
            ))}
            <div
              className={clsx(classes.line, "typingLine")}
              ref={typingLineRef}
              lang={verse.language}
            >
              <span className="committed"></span>
              <span className={`typing ${classes.typing}`}></span>
            </div>
          </div>
          <div className={classes.meta}>
            <div className={classes.title}>{entry.title}</div>
            <div className={classes.artists}>{artistString}</div>
            <TagRow tags={entry.tags} />
          </div>
        </article>
        <footer>Project Lyricova Screensaver Gen 2</footer>
      </section>
    </>
  );
}
