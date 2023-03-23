import clsx from "clsx";
import { GetServerSideProps } from "next";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TagRow } from "../../components/public/TagRow";
import { generateColorGradientSteps } from "../../frontendUtils/colors";
import { ScreensaverProps } from "../../utils/screensaverProps";
import { getServerSideProps as getProps } from "../../utils/screensaverProps";
import classes from "./stacked.module.scss";
import gsap from "gsap";
import { TextPlugin } from "gsap/dist/TextPlugin";
import { buildAnimationSequence } from "lyricova-common/utils/typingSequence";
import { PlainTextHangingPunct } from "../../components/public/PlainTextHangingPunct";

gsap.registerPlugin(TextPlugin);

export const getServerSideProps: GetServerSideProps<ScreensaverProps> =
  getProps;

export default function TypingStackedScreensaver({
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
    () => generateColorGradientSteps(entry.tags, false),
    [entry]
  );

  const [lines, setLines] = useState<[string, number, string][]>([
    ["Project Lyricova Screensaver", -1, "en"],
    ["Generation 3", -1, "en"],
  ]);

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
            setLines((lines) =>
              [
                ...lines,
                [verseLines[lineIdx], verse.id, verse.language] as [
                  string,
                  number,
                  string
                ],
              ].slice(-50)
            );
          },
          [lineIdx],
          i * stepDuration
        );
        tl.set(committedEl, { text: "" }, i * stepDuration);
        tl.set(typingEl, { text: "" }, i * stepDuration);
        i++;
      }

      if (sequence.length < verseLines.length) {
        tl.call(
          (missingLines: string[]) => {
            setLines((lines) =>
              [
                ...lines,
                ...missingLines.map<[string, number, string]>((l) => [
                  l,
                  verse.id,
                  verse.language,
                ]),
              ].slice(-50)
            );
          },
          [verseLines.slice(sequence.length)],
          ">"
        );
      }

      tl.call(
        () => {
          const newCursor = (cursor + 1) % verses.length;
          setCursor(newCursor);
          tl.kill();
          buildTimeline(lineEl, newCursor);
        },
        [],
        ">+1"
      );
      timelineRef.current = tl;
    },
    [verses]
  );

  useEffect(() => {
    if (typingLineRef.current)
      buildTimeline(typingLineRef.current, cursorRef.current);
  }, [buildTimeline]);

  return (
    <>
      <header className={classes.header}>
        <div className={classes.headerMeta}>
          <TagRow tags={entry.tags} />
          <div className={classes.title}>{entry.title}</div>
          <div className={classes.artists}>{artistString}</div>
        </div>
        <div className={classes.headerTime}>
          {h}
          <span className={classes.colon}>:</span>
          {m}
          <span className={classes.colon}>:</span>
          {s}
        </div>
      </header>
      <div className={classes.curtain}>
        <div
          className={classes.curtainBar}
          style={{
            backgroundImage:
              colors.length > 1
                ? `linear-gradient(to right, ${colors.join(", ")})`
                : undefined,
            backgroundColor: colors.length === 1 ? colors[0] : undefined,
          }}
        />
        <svg
          width="100%"
          height="100%"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <mask
            id="mask0_180_743"
            style={{ maskType: "alpha" }}
            maskUnits="userSpaceOnUse"
            x="0"
            y="0"
            width="100%"
            height="100%"
          >
            <rect
              width="100%"
              height="100%"
              fill="url(#paint0_linear_180_743)"
            />
          </mask>
          <g mask="url(#mask0_180_743)">
            <rect
              width="100%"
              height="100%"
              fill="url(#paint1_linear_180_743)"
            />
          </g>
          <defs>
            <linearGradient
              id="paint0_linear_180_743"
              x1="0"
              y1="0"
              x2="0"
              y2="100%"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#000" stopOpacity="0.3" />
              <stop offset="0.666" stopColor="#000" stopOpacity="0.05" />
              <stop offset="1" stopColor="#000" stopOpacity="0" />
            </linearGradient>
            <linearGradient
              id="paint1_linear_180_743"
              x1="0"
              y1="0"
              x2="100%"
              y2="0"
              gradientUnits="userSpaceOnUse"
            >
              {colors.map((color, i) => (
                <stop
                  key={color}
                  offset={i / (colors.length - 1) || 0}
                  stopColor={color}
                />
              ))}
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div className={classes.fadeCurtain} />
      <div className={classes.lines}>
        {lines.map(([line, id, language], idx) => (
          <div
            className={clsx(
              classes.line,
              id === verse.id && classes.lineActive
            )}
            key={`${line}${idx}`}
            lang={language}
          >
            <PlainTextHangingPunct>{line}</PlainTextHangingPunct>
          </div>
        ))}
        <div
          className={clsx(classes.line, classes.lineActive, "typingLine")}
          ref={typingLineRef}
          lang={verse.language}
        >
          <span className="committed"></span>
          <span className={`typing ${classes.typing}`}></span>
          <span className={classes.cursor} />
        </div>
      </div>
    </>
  );
}
