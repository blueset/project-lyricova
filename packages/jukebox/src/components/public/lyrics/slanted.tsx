import type { LyricsKitLyrics } from "@lyricova/components/gql/schema";
import { useAppContext } from "../AppContext";
import { usePlainPlayerLyricsState } from "../../../hooks/usePlainPlayerLyricsState";
import { useTrackwiseTimelineControl } from "../../../hooks/useTrackwiseTimelineControl";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { cn } from "@lyricova/components/utils";
import { safeDuration } from "../../../frontendUtils/safeDuration";

interface Props {
  lyrics: LyricsKitLyrics;
  transLangIdx?: number;
}

/**
 * Render horizontally scrolling slanted lyrics on a track-wide GSAP timeline.
 *
 * Resize observations rebuild the layout-dependent timeline, which is then
 * synchronized against the media element and disposed when replaced.
 */
export function SlantedLyrics({ lyrics, transLangIdx }: Props) {
  const { playerRef } = useAppContext();
  const container = useRef<HTMLDivElement>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const currentLine = useRef<HTMLSpanElement>(null);
  const translationContainer = useRef<HTMLDivElement>(null);
  const translationWrapper = useRef<HTMLDivElement>(null);
  const currentTranslation = useRef<HTMLSpanElement>(null);
  const lang = lyrics.translationLanguages[transLangIdx ?? 0];

  const hasTranslation = lyrics.translationLanguages.length > 0;

  const { playerState, currentFrameId, startTimes, endTimes } =
    usePlainPlayerLyricsState(lyrics, playerRef);

  const [layoutVersion, setLayoutVersion] = useState(0);
  const [timeline, setTimeline] = useState<gsap.core.Timeline | null>(null);

  useEffect(() => {
    const observedElements = [
      container.current,
      wrapper.current,
      translationContainer.current,
      translationWrapper.current,
    ].filter((element): element is HTMLDivElement => element !== null);
    if (!observedElements.length) return;

    const observer = new ResizeObserver(() => {
      setLayoutVersion((version) => version + 1);
    });
    observedElements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [hasTranslation, transLangIdx]);

  useLayoutEffect(() => {
    const mainWrapper = wrapper.current;
    const mainContainer = container.current;
    if (!mainWrapper || !mainContainer) return;

    const tl = gsap.timeline({
      paused: true,
    });
    const lines = mainWrapper.children;
    tl.set(mainWrapper, { x: 0 }, 0);
    for (let i = 0; i < lines.length; i++) {
      const element = lines[i] as HTMLSpanElement;
      tl.to(
        mainWrapper,
        {
          x: -(
            element.offsetLeft -
            mainContainer.offsetWidth / 2 +
            element.offsetWidth
          ),
          duration: safeDuration(startTimes[i] ?? 0, endTimes[i + 1] ?? 0),
          ease: "none",
        },
        startTimes[i],
      );
    }

    const translatedWrapper = translationWrapper.current;
    const translatedContainer = translationContainer.current;
    if (translatedWrapper && translatedContainer) {
      const translatedLines = translatedWrapper.children;
      tl.set(translatedWrapper, { x: 0 }, 0);
      for (let i = 0; i < translatedLines.length; i++) {
        const element = translatedLines[i] as HTMLSpanElement;
        tl.to(
          translatedWrapper,
          {
            x: -(
              element.offsetLeft -
              translatedContainer.offsetWidth / 2 +
              element.offsetWidth
            ),
            duration: safeDuration(startTimes[i] ?? 0, endTimes[i + 1] ?? 0),
            ease: "none",
          },
          startTimes[i],
        );
      }
    }

    setTimeline(tl);
    return () => {
      tl.kill();
    };
  }, [endTimes, layoutVersion, startTimes, transLangIdx]);

  useTrackwiseTimelineControl(playerRef, playerState, timeline);

  return (
    <div className="size-full overflow-hidden flex justify-center flex-col mask-x-from-[calc(100%_-_40px)] mask-x-to-100%">
      <div
        className="whitespace-nowrap overflow-hidden text-3xl"
        style={{ transform: "skew(-5deg, -5deg)" }}
        lang="ja"
        ref={container}
      >
        <div
          ref={wrapper}
          className="before:content-[' '] before:w-1/2 before:inline-block after:content-[' '] after:w-1/2 after:inline-block"
        >
          {lyrics.lines.map((v, idx) => {
            return (
              <span
                key={idx}
                className={cn(
                  "font-semibold opacity-50 pr-4",
                  idx === currentFrameId && "opacity-100",
                )}
                ref={idx === currentFrameId ? currentLine : null}
              >
                {v.content}
              </span>
            );
          })}
        </div>
      </div>
      {hasTranslation && (
        <div
          className="whitespace-nowrap overflow-hidden text-2xl"
          style={{ transform: "skew(-5deg, -5deg)" }}
          lang="zh"
          ref={translationContainer}
        >
          <div
            ref={translationWrapper}
            className="before:content-[' '] before:w-1/2 before:inline-block after:content-[' '] after:w-1/2 after:inline-block"
          >
            {lyrics.lines.map((v, idx) => {
              return (
                <span
                  key={idx}
                  className={cn(
                    "font-semibold opacity-50 pr-4",
                    idx === currentFrameId && "opacity-100",
                  )}
                  ref={idx === currentFrameId ? currentTranslation : null}
                >
                  {v.attachments.translations[lang]}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
