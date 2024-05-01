import { gql, useQuery } from "@apollo/client";
import { Stack, styled } from "@mui/material";
import _ from "lodash";
import { ReactNode, useMemo, useRef, useState } from "react";
import { getLayout } from "../components/public/layouts/IndexLayout";
import { FocusedLyrics } from "../components/public/lyrics/focused";
import { PlainLyrics } from "../components/public/lyrics/plain";
import { LyricsSwitchButton } from "../components/public/LyricsSwitchButton";
import type { LyricsKitLyrics } from "../graphql/LyricsKitObjects";
import { SlantedLyrics } from "../components/public/lyrics/slanted";
import { ParagraphLyrics } from "../components/public/lyrics/paragraph";
import { TypingFocusedLyrics } from "../components/public/lyrics/typingFocused";
import { TypingStackedLyrics } from "../components/public/lyrics/typingStack";
import { KaraokeJaLyrics } from "../components/public/lyrics/karaokeJa";
import { StrokeLyrics } from "../components/public/lyrics/stroke";
import { useClientPersistentState } from "../frontendUtils/clientPersistantState";
import type { DocumentNode } from "graphql";
import { useAppDispatch, useAppSelector } from "../redux/public/store";
import { currentSongSelector } from "../redux/public/playlist";
import TooltipIconButton from "../components/dashboard/TooltipIconButton";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import { toggleFullscreen } from "../redux/public/display";
import { LyricsFullScreenOverlay } from "../components/public/LyricsFullScreenOverlay";
import { PictureInPictureLyrics } from "../components/public/lyrics/pip";
import { AMLLyrics } from "../components/public/lyrics/amll";
import { RingollLyrics } from "../components/public/lyrics/ringoll/ringoll";
import { LyricsTranslationLanguageSwitchButton } from "../components/public/LyricsTranslationLanguageSwitchButton";

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
  "Plain": (lyrics: LyricsKitLyrics, transLangIdx?: number) => <PlainLyrics lyrics={lyrics} />,
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

const LyricsControlsDiv = styled("div")`
  position: absolute;
  top: 0;
  right: 16px;
  display: flex;
  flex-direction: row;
  gap: 8px;
`;

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
    const languages = lyricsQuery.data?.musicFile?.lyrics?.translationLanguages ?? [];
    setTranslationLanguageIdx((idx) => Math.max(0, Math.min(idx, languages.length - 1)));
    return languages;
  }, [lyricsQuery.data?.musicFile?.lyrics?.translationLanguages]);

  const MessageBox = ({ children }: { children: ReactNode }) => (
    <Stack
      // className="coverMask"
      alignItems="center"
      justifyContent="center"
      sx={{
        width: "100%",
        height: "100%",
        fontWeight: 600,
        fontSize: "2.5em",
        fontStyle: "italic",
        // filter: "var(--jukebox-cover-filter-brighter)",
        padding: 4,
      }}
    >
      {children}
    </Stack>
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
    node = moduleNode(lyricsQuery.data.musicFile.lyrics, translationLanguageIdx);
  } else {
    node = <MessageBox>No lyrics</MessageBox>;
  }

  const controls = (
    <LyricsControlsDiv
      sx={{ pt: isFullscreen ? 2 : 0 }}
      onClick={(evt) => evt.stopPropagation()}
    >
      <TooltipIconButton
        title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
        color="primary"
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
        {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
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
    </LyricsControlsDiv>
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

// Persisted layout pattern based on the works of Adam Wathan
// https://adamwathan.me/2019/10/17/persistent-layout-patterns-in-nextjs/
Index.layout = getLayout;
