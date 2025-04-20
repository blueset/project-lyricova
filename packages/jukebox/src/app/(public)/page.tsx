"use client";

import { gql, useQuery } from "@apollo/client";
import { ReactNode, useMemo, useRef, useState } from "react";
import { FocusedLyrics } from "@/components/public/lyrics/focused";
import { PlainLyrics } from "@/components/public/lyrics/plain";
import { LyricsSwitchButton } from "@/components/public/LyricsSwitchButton";
import type { LyricsKitLyrics } from "@lyricova/api/graphql/types";
import { SlantedLyrics } from "@/components/public/lyrics/slanted";
import { ParagraphLyrics } from "@/components/public/lyrics/paragraph";
import { TypingFocusedLyrics } from "@/components/public/lyrics/typingFocused";
import { TypingStackedLyrics } from "@/components/public/lyrics/typingStack";
import { KaraokeJaLyrics } from "@/components/public/lyrics/karaokeJa";
import { StrokeLyrics } from "@/components/public/lyrics/stroke";
import { useClientPersistentState } from "@/frontendUtils/clientPersistantState";
import type { DocumentNode } from "graphql";
import { useAppDispatch, useAppSelector } from "@/redux/public/store";
import { currentSongSelector } from "@/redux/public/playlist";
import { toggleFullscreen } from "@/redux/public/display";
import { LyricsFullScreenOverlay } from "@/components/public/LyricsFullScreenOverlay";
import { PictureInPictureLyrics } from "@/components/public/lyrics/pip";
import { AMLLyrics } from "@/components/public/lyrics/amll";
import { RingollLyrics } from "@/components/public/lyrics/ringoll/ringoll";
import { LyricsTranslationLanguageSwitchButton } from "@/components/public/LyricsTranslationLanguageSwitchButton";
import TooltipIconButton from "@/components/dashboard/TooltipIconButton";
import { Maximize, Minimize } from "lucide-react";
import { cn } from "@lyricova/components/utils";
import _ from "lodash";

const args = new URLSearchParams(
  typeof window === "object" ? window?.location?.search ?? "" : ""
);
const useYuuruka =
  args.get("yuuruka") === "true" ||
  args.get("yuuruka") === "1" ||
  args.get("uwu") === "true" ||
  args.get("uwu") === "1" ||
  args.get("kawaii") === "true" ||
  args.get("kawaii") === "1";

const LYRICS_QUERY = gql`
  query Lyrics($id: Int!) {
    musicFile(id: $id) {
      lyrics {
        translationLanguages
        lines {
          content
          position
          attachments {
            translation
            translations
            timeTag {
              duration
              tags {
                index
                timeTag
              }
            }
            furigana {
              content
              leftIndex
              rightIndex
            }
            role
            minor
          }
        }
      }
    }
  }
` as DocumentNode;

// prettier-ignore
const MODULE_LIST = {
  "Focused": (lyrics: LyricsKitLyrics, transLangIdx?: number) => <FocusedLyrics lyrics={lyrics} transLangIdx={transLangIdx} variant="plain" />,
  "Focused Glow": (lyrics: LyricsKitLyrics, transLangIdx?: number) => <FocusedLyrics lyrics={lyrics} transLangIdx={transLangIdx} variant="glow" />,
  "Focused Glow Seg": (lyrics: LyricsKitLyrics, transLangIdx?: number) => <FocusedLyrics lyrics={lyrics} transLangIdx={transLangIdx} variant="glowPerSyllable" />,
  "Plain": (lyrics: LyricsKitLyrics, transLangIdx?: number) => <PlainLyrics lyrics={lyrics} transLangIdx={transLangIdx} />,
  "Ringoll": (lyrics: LyricsKitLyrics, transLangIdx?: number) => <RingollLyrics lyrics={lyrics} transLangIdx={transLangIdx} />,
  "AMLL": (lyrics: LyricsKitLyrics, transLangIdx?: number) => <AMLLyrics lyrics={lyrics} transLangIdx={transLangIdx} />,
  "Nicokara": (lyrics: LyricsKitLyrics, transLangIdx?: number) => <KaraokeJaLyrics lyrics={lyrics} />,
  "Slanted": (lyrics: LyricsKitLyrics, transLangIdx?: number) => <SlantedLyrics lyrics={lyrics} transLangIdx={transLangIdx} />,
  "Paragraph": (lyrics: LyricsKitLyrics, transLangIdx?: number) => <ParagraphLyrics lyrics={lyrics} />,
  "Typing/Focused": (lyrics: LyricsKitLyrics, transLangIdx?: number) => <TypingFocusedLyrics lyrics={lyrics} />,
  "Typing/Stacked": (lyrics: LyricsKitLyrics, transLangIdx?: number) => <TypingStackedLyrics lyrics={lyrics} />,
  "Stroke": (lyrics: LyricsKitLyrics, transLangIdx?: number) => <StrokeLyrics lyrics={lyrics} />,
  "PIP (Alpha)": (lyrics: LyricsKitLyrics, transLangIdx?: number) => <PictureInPictureLyrics lyrics={lyrics} />,
} as const;

export default function Index() {
  const [module, setModule] = useClientPersistentState<
    keyof typeof MODULE_LIST
  >("Focused", "module", "lyricovaPlayer");
  const [translationLanguageIdx, setTranslationLanguageIdx] = useState(0);

  const keys = Object.keys(MODULE_LIST) as (keyof typeof MODULE_LIST)[];
  const moduleNode = MODULE_LIST[module] ?? MODULE_LIST[keys[0]];
  const nowPlaying = useAppSelector((s) => s.playlist.nowPlaying);
  const currentSong = useAppSelector(currentSongSelector);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const isFullscreen = useAppSelector((s) => s.display.isFullscreen);
  const dispatch = useAppDispatch();

  const lyricsQuery = useQuery<{ musicFile?: { lyrics: LyricsKitLyrics } }>(
    LYRICS_QUERY,
    {
      variables: {
        id: currentSong?.id,
      },
    }
  );

  const languages = useMemo(() => {
    const languages =
      lyricsQuery.data?.musicFile?.lyrics?.translationLanguages ?? [];
    setTranslationLanguageIdx((idx) =>
      Math.max(0, Math.min(idx, languages.length - 1))
    );
    return languages;
  }, [lyricsQuery.data?.musicFile?.lyrics?.translationLanguages]);

  const MessageBox = ({ children }: { children: ReactNode }) => (
    <div
      className={cn(
        "flex flex-col items-center justify-center w-full h-full font-semibold italic p-4",
        useYuuruka ? "text-2xl" : "text-4xl"
      )}
    >
      {useYuuruka && (
        <img
          src="/images/yuuruka.svg"
          alt="Project Lyricova"
          style={{ height: "6rem", opacity: 0.6, marginBlockEnd: "1rem" }}
        />
      )}
      {children}
    </div>
  );

  let node;
  if (lyricsQuery.loading) {
    node = <MessageBox>Loading...</MessageBox>;
  } else if (lyricsQuery.error) {
    if (nowPlaying !== null) {
      node = <MessageBox>{`${lyricsQuery.error}`}</MessageBox>;
    } else {
      node = <MessageBox>No track.</MessageBox>;
    }
  } else if (lyricsQuery?.data?.musicFile?.lyrics) {
    node = moduleNode(
      lyricsQuery.data.musicFile.lyrics,
      translationLanguageIdx
    );
  } else {
    node = <MessageBox>No lyrics.</MessageBox>;
  }

  const controls = (
    <div
      className={cn(
        "absolute top-0 right-4 flex flex-row gap-2",
        isFullscreen && "pt-2"
      )}
      onClick={(evt) => evt.stopPropagation()}
    >
      <TooltipIconButton
        title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
        variant="ghostBright"
        onClick={async () => {
          dispatch(toggleFullscreen());
          if (isFullscreen) {
            document.exitFullscreen?.()?.catch(() => {
              /* No-op */
            });
            if (wakeLockRef.current) {
              wakeLockRef.current.release();
            }
          } else {
            const wakeLock = await navigator.wakeLock?.request("screen");
            if (wakeLock) {
              wakeLockRef.current = wakeLock;
              wakeLock.addEventListener("release", () => {
                wakeLockRef.current = null;
              });
            } else {
              wakeLockRef.current = null;
            }
          }
        }}
      >
        {isFullscreen ? <Minimize /> : <Maximize />}
      </TooltipIconButton>
      <LyricsTranslationLanguageSwitchButton
        languages={languages}
        selectedLanguageIdx={translationLanguageIdx}
        setSelectedLanguageIdx={setTranslationLanguageIdx}
      />
      <LyricsSwitchButton<keyof typeof MODULE_LIST>
        module={module}
        setModule={setModule}
        moduleNames={keys}
      />
    </div>
  );

  return (
    <>
      {node}
      {isFullscreen ? (
        <LyricsFullScreenOverlay>{controls}</LyricsFullScreenOverlay>
      ) : (
        controls
      )}
    </>
  );
}
