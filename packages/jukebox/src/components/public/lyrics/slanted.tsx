import type { LyricsKitLyrics } from "@lyricova/api/graphql/types";
import { useAppContext } from "../AppContext";
import { usePlainPlayerLyricsState } from "../../../hooks/usePlainPlayerLyricsState";
import { useTrackwiseTimelineControl } from "../../../hooks/useTrackwiseTimelineControl";
import type { CSSProperties } from "react";
import { useMemo, useRef } from "react";
import gsap from "gsap";
import _ from "lodash";
import { cn } from "@lyricova/components/utils";

interface Props {
  lyrics: LyricsKitLyrics;
  transLangIdx?: number;
}

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

  const timeline = useMemo(() => {
    const tl = gsap.timeline({
      paused: true,
    });
    requestAnimationFrame(() => {
      if (wrapper.current && container.current) {
        const lines = wrapper.current.children;
        tl.set(wrapper.current, { x: 0 }, 0);
        for (let i = 0; i < lines.length; i++) {
          const el = lines[i] as HTMLDivElement;
          tl.to(
            wrapper.current,
            {
              x: -(
                el.offsetLeft -
                container.current.offsetWidth / 2 +
                el.offsetWidth
              ),
              duration: endTimes[i + 1] - startTimes[i],
              ease: "none",
            },
            startTimes[i]
          );
        }
      }
      if (translationWrapper.current && translationContainer.current) {
        const lines = translationWrapper.current.children;
        tl.set(translationWrapper.current, { x: 0 }, 0);
        for (let i = 0; i < lines.length; i++) {
          const el = lines[i] as HTMLDivElement;
          tl.to(
            translationWrapper.current,
            {
              x: -(
                el.offsetLeft -
                translationContainer.current.offsetWidth / 2 +
                el.offsetWidth
              ),
              duration: endTimes[i + 1] - startTimes[i],
              ease: "none",
            },
            startTimes[i]
          );
        }
      }
      const now = performance.now();
      if (playerState.state === "playing") {
        const progress = (now - playerState.startingAt) / 1000;
        timeline.play(progress, false);
      } else {
        timeline.pause(playerState.progress, false);
      }
    });
    return tl;

    // Adding wrapper.current, translationWrapper.current for the timeline to change along with the lyrics.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    wrapper.current,
    translationWrapper.current,
    startTimes,
    endTimes,
    transLangIdx,
  ]);

  useTrackwiseTimelineControl(playerState, timeline);

  return (
    <div
      className="size-full overflow-hidden flex justify-center flex-col"
      style={
        {
          maskBorderImageSource:
            "linear-gradient(90deg, rgba(0,0,0,0) 0% , rgba(0,0,0,1) 49%, rgba(0,0,0,1) 51%, rgba(0,0,0,0) 100%)",
          maskBorderImageSlice: "0 49% fill",
          maskBorderImageWidth: "0 40px",
          maskBoxImageSource:
            "linear-gradient(90deg, rgba(0,0,0,0) 0% , rgba(0,0,0,1) 49%, rgba(0,0,0,1) 51%, rgba(0,0,0,0) 100%)",
          maskBoxImageSlice: "0 49% fill",
          maskBoxImageWidth: "0 40px",
          WebkitMaskBoxImageSource:
            "linear-gradient(90deg, rgba(0,0,0,0) 0% , rgba(0,0,0,1) 49%, rgba(0,0,0,1) 51%, rgba(0,0,0,0) 100%)",
          WebkitMaskBoxImageSlice: "0 49% fill",
          WebkitMaskBoxImageWidth: "0 40px",
        } as unknown as CSSProperties
      }
    >
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
                  idx === currentFrameId && "opacity-100"
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
                    idx === currentFrameId && "opacity-100"
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
