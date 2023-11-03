import type { Entry } from "lyricova-common/models/Entry";
import { buildAnimationSequence } from "lyricova-common/utils/typingSequence";
import type { CSSProperties } from "react";
import { useCallback, useMemo, useRef } from "react";
import { PlainTextHangingPunct } from "../PlainTextHangingPunct";
import { TagRow } from "../TagRow";
import { PulseStatus } from "./PulseStatus";
import classes from "./TopEntry.module.scss";
import gsap from "gsap";
import { TextPlugin } from "gsap/dist/TextPlugin";
import { Link } from "../Link";
import { generateColorGradient } from "../../../frontendUtils/colors";
import { resizeVerse } from "../../../utils/sizing";

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

  const tagsGradient = useMemo(
    () => generateColorGradient(entry.tags, true),
    [entry.tags]
  );

  const entryRef = useRef<HTMLElement>(null);
  const timelineRef = useRef<gsap.core.Timeline>();

  const buildTimeline = useCallback(
    (verseRefEl: HTMLElement) => {
      if (timelineRef.current) {
        timelineRef.current.kill();
      }

      const tl = gsap.timeline();
      const stepDuration = 1 / 40;
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
        tl.set(outcomeEl, { opacity: 1 }, i * stepDuration);
        tl.set(committedEl, { text: "" }, i * stepDuration);
        tl.set(typingEl, { text: "" }, i * stepDuration);
        i++;
      }
      timelineRef.current = tl;
      return () => {
        tl.kill();
      };
    },
    [mainVerse.typingSequence, mainVerse.language]
  );

  return (
    <section
      className={`container verticalPadding ${classes.container}`}
      ref={entryRef}
      style={
        {
          "--tags-gradient": tagsGradient,
          "--tags-foreground": entry.tags?.[0]?.color,
        } as CSSProperties
      }
      onMouseEnter={(evt) => {
        timelineRef.current
          ?.timeScale(evt.ctrlKey || evt.metaKey ? 0.2 : 1)
          .restart();
      }}
      onMouseLeave={() => {
        timelineRef.current?.pause(timelineRef.current?.endTime());
      }}
    >
      <div className={classes.otherVerses}>
        {otherVerses.map((verse) => (
          <div key={verse.id} lang={verse.language}>
            <PlainTextHangingPunct>{verse.text}</PlainTextHangingPunct>
          </div>
        ))}
      </div>
      <TagRow tags={entry.tags} />
      <Link
        href={`/entries/${entry.id}`}
        className={classes.verse}
        ref={async (elm) => {
          if (elm) {
            await document.fonts.ready;
            resizeVerse(elm);
            buildTimeline(elm);
          }
        }}
        lang={mainVerse.language}
      >
        {mainVerse.text.split("\n").map((line, i) => (
          <div key={i} data-line={i} className={classes.verseLine}>
            <span className="outcome">
              <PlainTextHangingPunct>{line}</PlainTextHangingPunct>
            </span>
            <span className={classes.animation}>
              <span className={`committed ${classes.committed}`}></span>
              <span className={classes.typing}>
                <span
                  className="typing"
                  style={{ "-webkit-background-clip": "text" } as CSSProperties}
                ></span>
              </span>
            </span>
          </div>
        ))}
      </Link>
      <div className={classes.meta}>
        <div className={classes.title}>{entry.title}</div>
        <div className={classes.artists}>{artistString}</div>
      </div>
      <div className={classes.pulse}>
        <PulseStatus entry={entry} />
      </div>
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
    </section>
  );
}
