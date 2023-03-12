import { buildAnimationSequence } from "lyricova-common/utils/typingSequence";
import { useCallback, useRef } from "react";
import { BaseVerseRenderer } from "./BaseVerseRenderer";
import gsap from "gsap";
import { TextPlugin } from "gsap/dist/TextPlugin";
import classes from "./BlockVerseRenderer.module.scss";
import clsx from "clsx";

gsap.registerPlugin(TextPlugin);

interface BlockVerseRendererProps {
  lines: string[];
  renderMode: "plain" | "stylized" | "html";
  baseTypingSequence: [string, string][][];
  language: string;
  isMain: boolean;
}

export function BlockVerseRenderer({
  lines,
  renderMode,
  baseTypingSequence,
  language,
  isMain,
}: BlockVerseRendererProps) {
  const timelineRef = useRef<gsap.core.Timeline>();
  const buildTimeline = useCallback(
    (verseRefEl: HTMLElement) => {
      if (timelineRef.current) {
        timelineRef.current.kill();
      }

      const tl = gsap.timeline({
        ease: "power2.inOut",
        paused: !isMain,
      });

      const baseEl = verseRefEl.querySelector(".base");
      const animationEl = verseRefEl.querySelector(".animation");
      const coverEl = verseRefEl.querySelector(".cover");

      const stepDuration = 1 / 15;
      const sequence = baseTypingSequence.map((i) =>
        buildAnimationSequence(i, language)
      );
      const preAnimDuration = 0.3;
      tl.fromTo(
        coverEl,
        { transformOrigin: "top", scaleY: 0 },
        { scaleY: 1, duration: preAnimDuration / 2 }
      )
        .set(baseEl, { visibility: "hidden" }, ">")
        .set(animationEl, { visibility: "visible" }, ">")
        .set(coverEl, { transformOrigin: "bottom" }, ">")
        .to(coverEl, { scaleY: 0, duration: preAnimDuration / 2 }, ">");
      let i = 0;
      for (let lineIdx = 0; lineIdx < sequence.length; lineIdx++) {
        const line = sequence[lineIdx];
        let committed = "";
        const lineEl = animationEl.querySelector(`[data-line="${lineIdx}"]`);
        if (!lineEl) continue;
        const typingEl = lineEl.querySelector(".typing");
        const committedEl = lineEl.querySelector(".committed");
        tl.set(typingEl, { text: "" }, 0);
        tl.set(committedEl, { text: "" }, 0);
        if (!typingEl || !committedEl) continue;
        for (const step of line) {
          if (step.convert) {
            for (const frame of step.sequence.slice(0, -1)) {
              tl.set(
                typingEl,
                { text: frame },
                preAnimDuration + i * stepDuration
              );
              i++;
            }
            committed += step.sequence[step.sequence.length - 1];
            tl.set(
              committedEl,
              { text: committed },
              preAnimDuration + i * stepDuration
            );
            tl.set(typingEl, { text: "" }, preAnimDuration + i * stepDuration);
            i++;
          } else {
            for (const frame of step.sequence) {
              tl.set(
                committedEl,
                { text: committed + frame },
                preAnimDuration + i * stepDuration
              );
              i++;
            }
            committed += step.sequence[step.sequence.length - 1];
          }
        }
        tl.set(typingEl, { text: "" }, preAnimDuration + i * stepDuration);
        i++;
      }

      tl.set(coverEl, { transformOrigin: "top" }, ">")
        .fromTo(
          coverEl,
          { scaleY: 0 },
          { scaleY: 1, duration: preAnimDuration / 2 }
        )
        .set(baseEl, { visibility: "visible" }, ">")
        .set(animationEl, { visibility: "hidden" }, ">")
        .set(coverEl, { transformOrigin: "bottom" }, ">")
        .to(coverEl, { scaleY: 0, duration: preAnimDuration / 2 }, ">");

      timelineRef.current = tl;
    },
    [baseTypingSequence, isMain, language]
  );

  return (
    <div
      className={clsx(classes.container, isMain && classes.main)}
      onClick={(evt) => {
        timelineRef.current?.isActive() === false &&
          timelineRef.current
            ?.timeScale(evt.ctrlKey || evt.metaKey ? 0.5 : 1)
            .restart();
      }}
      onMouseEnter={(evt) => {
        timelineRef.current?.isActive() === false &&
          timelineRef.current
            ?.timeScale(evt.ctrlKey || evt.metaKey ? 0.5 : 1)
            .restart();
      }}
      onMouseLeave={() => {
        timelineRef.current?.pause(timelineRef.current?.endTime());
      }}
      ref={async (elm) => elm && buildTimeline(elm)}
    >
      <div className={`base ${classes.base}`}>
        <BaseVerseRenderer renderMode={renderMode}>
          {lines.join("\n")}
        </BaseVerseRenderer>
      </div>
      <div className={`animation ${classes.animation}`}>
        {baseTypingSequence.map((line, lineIdx) => (
          <div key={lineIdx} data-line={lineIdx}>
            <span className={`committed ${classes.committed}`}></span>
            <span className={`typing ${classes.typing}`}></span>
          </div>
        ))}
      </div>
      <div className={`cover ${classes.cover}`} />
    </div>
  );
}
