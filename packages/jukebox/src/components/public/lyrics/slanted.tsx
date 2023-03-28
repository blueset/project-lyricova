import { LyricsKitLyrics } from "../../../graphql/LyricsKitObjects";
import { useAppContext } from "../AppContext";
import {
  usePlainPlayerLyricsState,
  useTrackwiseTimelineControl,
} from "../../../frontendUtils/hooks";
import { Box } from "@mui/material";
import { CSSProperties, useMemo, useRef } from "react";
import gsap from "gsap";
import _ from "lodash";

interface Props {
  lyrics: LyricsKitLyrics;
}

export function SlantedLyrics({ lyrics }: Props) {
  const { playerRef } = useAppContext();
  const container = useRef<HTMLDivElement>();
  const wrapper = useRef<HTMLDivElement>();
  const currentLine = useRef<HTMLSpanElement>();
  const translationContainer = useRef<HTMLDivElement>();
  const translationWrapper = useRef<HTMLDivElement>();
  const currentTranslation = useRef<HTMLSpanElement>();

  const hasTranslation = useMemo(
    () =>
      _.reduce(
        lyrics.lines,
        (res, val) => res || Boolean(val?.attachments?.translation),
        false
      ),
    [lyrics.lines]
  );

  const {
    playerState,
    currentFrameId,
    startTimes,
    endTimes,
  } = usePlainPlayerLyricsState(lyrics, playerRef);

  const timeline = useMemo(() => {
    const tl = gsap.timeline({
      paused: true,
    });
    console.log("wrapper-current", wrapper.current);
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
    return tl;

    // Adding wrapper.current, translationWrapper.current for the timeline to change along with the lyrics.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wrapper.current, translationWrapper.current, startTimes, endTimes]);

  useTrackwiseTimelineControl(playerState, timeline);

  return (
    <Box
      sx={
        ({
          width: "100%",
          height: "100%",
          overflow: "hidden",
          display: "flex",
          justifyContent: "center",
          flexDirection: "column",
          maskBorderImageSource:
            "linear-gradient(90deg, rgba(0,0,0,0) 0% , rgba(0,0,0,1) 49%, rgba(0,0,0,1) 51%, rgba(0,0,0,0) 100%)",
          maskBorderImageSlice: "0 49% fill",
          maskBorderImageWidth: "0 40px",
          maskBoxImageSource:
            "linear-gradient(90deg, rgba(0,0,0,0) 0% , rgba(0,0,0,1) 49%, rgba(0,0,0,1) 51%, rgba(0,0,0,0) 100%)",
          maskBoxImageSlice: "0 49% fill",
          maskBoxImageWidth: "0 40px",
          "-webkit-mask-box-image-source":
            "linear-gradient(90deg, rgba(0,0,0,0) 0% , rgba(0,0,0,1) 49%, rgba(0,0,0,1) 51%, rgba(0,0,0,0) 100%)",
          "-webkit-mask-box-image-slice": "0 49% fill",
          "-webkit-mask-box-image-width": "0 40px",
        } as unknown) as CSSProperties
      }
    >
      <Box
        sx={{
          whiteSpace: "nowrap",
          overflow: "hidden",
          transform: "rotate(-5deg)",
          fontSize: "2em",
        }}
        lang="ja"
        ref={container}
      >
        <Box
          ref={wrapper}
          sx={{
            "&:before, &:after": {
              content: '" "',
              width: "50%",
              display: "inline-block",
            },
          }}
        >
          {lyrics.lines.map((v, idx) => {
            return (
              <Box
                component="span"
                key={idx}
                sx={{
                  fontWeight: 600,
                  fontStyle: "italic",
                  opacity: 0.5,
                  paddingInlineEnd: "1em",
                  ...(idx === currentFrameId && { opacity: 1 }),
                }}
                ref={idx === currentFrameId ? currentLine : null}
              >
                {v.content}
              </Box>
            );
          })}
        </Box>
      </Box>
      {hasTranslation && (
        <Box
          sx={{
            whiteSpace: "nowrap",
            overflow: "hidden",
            transform: "rotate(-5deg)",
            fontSize: "1.5em",
          }}
          lang="zh"
          ref={translationContainer}
        >
          <Box
            ref={translationWrapper}
            sx={{
              "&:before, &:after": {
                content: '" "',
                width: "50%",
                display: "inline-block",
              },
            }}
          >
            {lyrics.lines.map((v, idx) => {
              return (
                <Box
                  component="span"
                  key={idx}
                  sx={{
                    fontWeight: 600,
                    fontStyle: "italic",
                    opacity: 0.5,
                    paddingInlineEnd: "1em",
                    ...(idx === currentFrameId && { opacity: 1 }),
                  }}
                  ref={idx === currentFrameId ? currentTranslation : null}
                >
                  {v.attachments.translation}
                </Box>
              );
            })}
          </Box>
        </Box>
      )}
    </Box>
  );
}
