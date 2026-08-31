"use client";
import { useQuery, skipToken } from "@apollo/client/react";
import { graphql } from "@lyricova/components/gql";
import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { useMemo, useRef, useState } from "react";
import { FocusedLyrics } from "@/components/public/lyrics/focused";
import { PlainLyrics } from "@/components/public/lyrics/plain";
import { LyricsSwitchButton } from "@/components/public/LyricsSwitchButton";
import type { MenuEntry } from "@/components/public/LyricsSwitchButton";
import type { LyricsKitLyrics } from "@lyricova/components/gql/schema";
import { SlantedLyrics } from "@/components/public/lyrics/slanted";
import { ParagraphLyrics } from "@/components/public/lyrics/paragraph";
import { TypingFocusedLyrics } from "@/components/public/lyrics/typingFocused";
import { TypingStackedLyrics } from "@/components/public/lyrics/typingStack";
import { KaraokeJaLyrics } from "@/components/public/lyrics/karaokeJa";
import { StrokeLyrics } from "@/components/public/lyrics/stroke";
import { useClientPersistentState } from "@/frontendUtils/clientPersistantState";
import { useAppDispatch, useAppSelector } from "@/redux/public/store";
import { currentSongSelector } from "@/redux/public/playlist";
import { toggleFullscreen } from "@/redux/public/display";
import { LyricsFullScreenOverlay } from "@/components/public/LyricsFullScreenOverlay";
import { PictureInPictureLyrics } from "@/components/public/lyrics/pip";
import { AMLLyrics } from "@/components/public/lyrics/amll";
import { RingollLyrics } from "@/components/public/lyrics/ringoll/ringoll";
import {
  HIDDEN_TRANSLATION_LANGUAGE_INDEX,
  LyricsTranslationLanguageSwitchButton,
} from "@/components/public/LyricsTranslationLanguageSwitchButton";
import TooltipIconButton from "@/components/dashboard/TooltipIconButton";
import { Maximize, Minimize } from "lucide-react";
import { cn } from "@lyricova/components/utils";

// Lazily loaded proof-of-concept WASM glyph renderer. Loading it dynamically
// (client-only) keeps the WASM shaper and multi-megabyte base font out of the
// bundle until this mode is actually selected.
const GlyphCanvasLyrics = dynamic(
  () =>
    import("@/components/public/lyrics/glyph/glyphCanvas").then(
      (m) => m.GlyphCanvasLyrics,
    ),
  { ssr: false },
);

// Ringoll's scrolling architecture with its text painted by the WASM glyph
// engine, plus AMLL's karaoke sweep, emphasis and interlude dots. Lazily loaded
// for the same reason as the PoC above: it pulls in the shaper and fonts.
const RingollCanvasLyrics = dynamic(
  () =>
    import("@/components/public/lyrics/ringollCanvas/ringollCanvas").then(
      (m) => m.RingollCanvasLyrics,
    ),
  { ssr: false },
);

const args = new URLSearchParams(
  typeof window === "object" ? (window?.location?.search ?? "") : "",
);
const useYuuruka =
  args.get("yuuruka") === "true" ||
  args.get("yuuruka") === "1" ||
  args.get("uwu") === "true" ||
  args.get("uwu") === "1" ||
  args.get("kawaii") === "true" ||
  args.get("kawaii") === "1";

const LYRICS_QUERY = graphql(`
  query Lyrics($id: Int!) {
    musicFile(id: $id) {
      lyrics {
        length
        quality
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
            romaji {
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
`);

// Keys are stable ids: they are persisted, never displayed, and must not change.
const MODULE_LIST = {
  focused: {
    label: "Focused (Plain)",
    path: ["Focused"],
    render: (lyrics: LyricsKitLyrics, transLangIdx?: number) => (
      <FocusedLyrics
        lyrics={lyrics}
        transLangIdx={transLangIdx}
        variant="plain"
      />
    ),
  },
  focusedGlow: {
    label: "Focused (Glow)",
    path: ["Focused"],
    render: (lyrics: LyricsKitLyrics, transLangIdx?: number) => (
      <FocusedLyrics
        lyrics={lyrics}
        transLangIdx={transLangIdx}
        variant="glow"
      />
    ),
  },
  focusedGlowSeg: {
    label: "Focused (Glow Seg)",
    path: ["Focused"],
    render: (lyrics: LyricsKitLyrics, transLangIdx?: number) => (
      <FocusedLyrics
        lyrics={lyrics}
        transLangIdx={transLangIdx}
        variant="glowPerSyllable"
      />
    ),
  },
  plain: {
    label: "Plain",
    render: (lyrics: LyricsKitLyrics, transLangIdx = 0) => (
      <PlainLyrics lyrics={lyrics} transLangIdx={transLangIdx} />
    ),
  },
  ringollCanvas: {
    label: "Ringoll Canvas",
    render: (lyrics: LyricsKitLyrics, transLangIdx = 0) => (
      <RingollCanvasLyrics lyrics={lyrics} transLangIdx={transLangIdx} />
    ),
  },
  ringoll: {
    label: "Ringoll",
    render: (lyrics: LyricsKitLyrics, transLangIdx = 0) => (
      <RingollLyrics lyrics={lyrics} transLangIdx={transLangIdx} />
    ),
  },
  amll: {
    label: "AMLL",
    render: (lyrics: LyricsKitLyrics, transLangIdx?: number) => (
      <AMLLyrics lyrics={lyrics} transLangIdx={transLangIdx} />
    ),
  },
  nicokara: {
    label: "Nicokara",
    render: (lyrics: LyricsKitLyrics, _transLangIdx?: number) => (
      <KaraokeJaLyrics lyrics={lyrics} />
    ),
  },
  slanted: {
    label: "Slanted",
    path: ["Classic"],
    render: (lyrics: LyricsKitLyrics, transLangIdx?: number) => (
      <SlantedLyrics lyrics={lyrics} transLangIdx={transLangIdx} />
    ),
  },
  paragraph: {
    label: "Paragraph",
    path: ["Classic"],
    render: (lyrics: LyricsKitLyrics, _transLangIdx?: number) => (
      <ParagraphLyrics lyrics={lyrics} />
    ),
  },
  typingFocused: {
    label: "Typing (Focused)",
    path: ["Typing"],
    render: (lyrics: LyricsKitLyrics, _transLangIdx?: number) => (
      <TypingFocusedLyrics lyrics={lyrics} />
    ),
  },
  typingStacked: {
    label: "Typing (Stacked)",
    path: ["Typing"],
    render: (lyrics: LyricsKitLyrics, _transLangIdx?: number) => (
      <TypingStackedLyrics lyrics={lyrics} />
    ),
  },
  stroke: {
    label: "Stroke",
    path: ["Classic"],
    render: (lyrics: LyricsKitLyrics, _transLangIdx?: number) => (
      <StrokeLyrics lyrics={lyrics} />
    ),
  },
  pipAlpha: {
    path: ["Alpha"],
    label: "PIP (Alpha)",
    render: (lyrics: LyricsKitLyrics, _transLangIdx?: number) => (
      <PictureInPictureLyrics lyrics={lyrics} />
    ),
  },
  glyphCanvasPoC: {
    label: "Glyph (PoC)",
    path: ["Alpha"],
    render: (lyrics: LyricsKitLyrics, transLangIdx = 0) => (
      <GlyphCanvasLyrics lyrics={lyrics} transLangIdx={transLangIdx} />
    ),
  },
} as const satisfies Record<
  string,
  {
    label: string;
    path?: string[];
    render: (lyrics: LyricsKitLyrics, transLangIdx?: number) => ReactNode;
  }
>;

type ModuleId = keyof typeof MODULE_LIST;

const MODULE_ITEMS: MenuEntry<ModuleId>[] = (
  Object.keys(MODULE_LIST) as ModuleId[]
).map((value) => {
  const entry = MODULE_LIST[value] as { label: string; path?: string[] };
  return { value, label: entry.label, path: entry.path && [...entry.path] };
});

export default function Index() {
  const [module, setModule] = useClientPersistentState<ModuleId>(
    "focused",
    "module",
    "lyricovaPlayer",
  );
  const [translationLanguageIdx, setTranslationLanguageIdx] = useState(
    HIDDEN_TRANSLATION_LANGUAGE_INDEX,
  );

  const moduleNode = (MODULE_LIST[module] ?? MODULE_LIST.focused).render;
  const nowPlaying = useAppSelector((s) => s.playlist.nowPlaying);
  const currentSong = useAppSelector(currentSongSelector);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const isFullscreen = useAppSelector((s) => s.display.isFullscreen);
  const dispatch = useAppDispatch();

  const lyricsQuery = useQuery(
    LYRICS_QUERY,
    currentSong?.id ? { variables: { id: currentSong.id } } : skipToken,
  );

  const languages = useMemo(() => {
    const languages =
      lyricsQuery.data?.musicFile?.lyrics?.translationLanguages ?? [];
    setTranslationLanguageIdx((idx) =>
      Math.max(
        HIDDEN_TRANSLATION_LANGUAGE_INDEX,
        Math.min(idx, languages.length - 1),
      ),
    );
    return languages;
  }, [lyricsQuery.data?.musicFile?.lyrics?.translationLanguages]);

  const MessageBox = ({ children }: { children: ReactNode }) => (
    <div
      className={cn(
        "flex flex-col items-center justify-center w-full h-full font-semibold italic p-4",
        useYuuruka ? "text-2xl" : "text-4xl",
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
  } else if (
    lyricsQuery?.dataState === "complete" &&
    lyricsQuery.data.musicFile?.lyrics
  ) {
    node = moduleNode(
      lyricsQuery.data.musicFile.lyrics,
      translationLanguageIdx,
    );
  } else {
    node = <MessageBox>No lyrics.</MessageBox>;
  }

  const controls = (
    <div
      className={cn(
        "absolute top-0 right-4 flex flex-row gap-2",
        isFullscreen && "pt-2",
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
      <LyricsSwitchButton<ModuleId>
        items={MODULE_ITEMS}
        value={module}
        onChange={setModule}
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
