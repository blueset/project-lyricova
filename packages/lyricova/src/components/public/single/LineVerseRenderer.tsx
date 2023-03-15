import { buildAnimationSequence } from "lyricova-common/utils/typingSequence";
import { useCallback, useRef } from "react";
import { BaseVerseRenderer } from "./BaseVerseRenderer";
import gsap from "gsap";
import { TextPlugin } from "gsap/dist/TextPlugin";
import classes from "./LineVerseRenderer.module.scss";
import clsx from "clsx";

gsap.registerPlugin(TextPlugin);

interface LineVerseRendererProps {
  lines: string[];
  renderMode: "plain" | "stylized" | "html";
  baseTypingSequence: [string, string][][];
  language: string;
  isMain: boolean;
}

export function LineVerseRenderer({
  lines,
  renderMode,
  baseTypingSequence,
  language,
  isMain,
}: LineVerseRendererProps) {
  const timelineRef = useRef<gsap.core.Timeline>();
  const buildTimeline = useCallback(
    (verseRefEl: HTMLElement) => {
      if (timelineRef.current) {
        timelineRef.current.kill();
      }

      const tl = gsap.timeline({ paused: !isMain });
      const stepDuration = language.match(/^(zh|ja)/) ? 1 / 15 : 1 / 30;
      const sequence = baseTypingSequence.map((i) =>
        buildAnimationSequence(i, language)
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
        tl.set(outcomeEl, { visibility: "hidden" }, 0);
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
        tl.set(outcomeEl, { visibility: "visible" }, i * stepDuration);
        tl.set(committedEl, { text: "" }, i * stepDuration);
        tl.set(typingEl, { text: "" }, i * stepDuration);
        i++;
      }
      timelineRef.current = tl;
      return () => {
        tl.kill();
      };
    },
    [baseTypingSequence, isMain, language]
  );

  return (
    <div
      className={clsx(
        classes.container,
        renderMode === "stylized" && classes.stylized,
        isMain && classes.main
      )}
      onClick={(evt) => {
        timelineRef.current?.isActive() === false &&
          !evt.altKey &&
          timelineRef.current
            ?.timeScale(evt.ctrlKey || evt.metaKey ? 0.5 : 1)
            .restart();
      }}
      onMouseEnter={(evt) => {
        timelineRef.current?.isActive() === false &&
          !evt.altKey &&
          timelineRef.current
            ?.timeScale(evt.ctrlKey || evt.metaKey ? 0.5 : 1)
            .restart();
      }}
      onMouseLeave={() => {
        timelineRef.current?.pause(timelineRef.current?.endTime());
      }}
      ref={async (elm) => elm && buildTimeline(elm)}
    >
      {lines.map((line, lineIdx) => (
        <div
          key={lineIdx}
          className={`line ${classes.line}`}
          data-line={lineIdx}
        >
          <div className={`outcome ${classes.outcome}`}>
            <BaseVerseRenderer renderMode={renderMode}>
              {line}
            </BaseVerseRenderer>
          </div>
          <div data-line={lineIdx} className={`animation ${classes.animation}`}>
            <span className={`committed ${classes.committed}`}></span>
            <span className={`typing ${classes.typing}`}></span>
          </div>
        </div>
      ))}
    </div>
  );
}
