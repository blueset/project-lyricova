import { addTrackToNext } from "@/redux/public/playlist";
import { useAppDispatch } from "@/redux/public/store";
import { DocumentNode, gql, useQuery } from "@apollo/client";
import { LyricsKitLyrics, MusicFile } from "@lyricova/api/graphql/types";
import { MusicFileFragments } from "@lyricova/components";
import { Button } from "@lyricova/components/components/ui/button";
import { Skeleton } from "@lyricova/components/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@lyricova/components/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";

const SINGLE_FILE_SONG_QUERY = gql`
  query ($id: Int!) {
    musicFile(id: $id) {
      id
      ...MusicFileForPlaylistAttributes
      lrcxLyrics: lyricsText(ext: "lrcx")
      lrcLyrics: lyricsText(ext: "lrc")

      lyrics {
        translationLanguages
        lines {
          content
          attachments {
            translations
          }
        }
      }
    }
  }

  ${MusicFileFragments.MusicFileForPlaylistAttributes}
` as DocumentNode;

type MusicFileWithLyrics = MusicFile & {
  lrcxLyrics?: string;
  lrcLyrics?: string;
  lyrics?: LyricsKitLyrics;
};

export function MusicFileActions({ fileId }: { fileId: number }) {
  const query = useQuery<{ musicFile: MusicFileWithLyrics }>(
    SINGLE_FILE_SONG_QUERY,
    {
      variables: { id: fileId },
    }
  );
  const dispatch = useAppDispatch();

  const handlePlayNext = () => {
    if (query.data?.musicFile) {
      dispatch(addTrackToNext(query.data?.musicFile));
    }
  };

  const handleCopyLrcx = () => {
    if (query.data?.musicFile?.lrcxLyrics) {
      navigator.clipboard.writeText(query.data.musicFile.lrcxLyrics);
      toast.success("LRCX lyrics copied to clipboard");
    }
  };
  const handleCopyLrc = () => {
    if (query.data?.musicFile?.lrcLyrics) {
      navigator.clipboard.writeText(query.data.musicFile.lrcLyrics);
      toast.success("LRC lyrics copied to clipboard");
    }
  };
  const handleCopyOriginalLyrics = () => {
    if (query.data?.musicFile?.lyrics) {
      const originalLyrics = query.data.musicFile.lyrics.lines
        .map((line) => line.content)
        .join("\n");
      navigator.clipboard.writeText(originalLyrics);
      toast.success("Original lyrics copied to clipboard");
    }
  };
  const handleCopyTranslations = (lang: string) => {
    if (query.data?.musicFile?.lyrics) {
      const translations = query.data.musicFile.lyrics.lines
        .map((line) => {
          return (
            (lang
              ? line.attachments.translations[lang]
              : line.attachments.translation) || ""
          );
        })
        .join("\n");
      navigator.clipboard.writeText(translations);
      toast.success(
        `Translation${lang ? ` in ${lang}` : ""} copied to clipboard`
      );
    }
  };

  if (query.loading) {
    return (
      <>
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
      </>
    );
  } else if (query.error) {
    return null;
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={handlePlayNext}>
        Play next
      </Button>
      {(query.data?.musicFile?.lrcLyrics ||
        query.data?.musicFile?.lrcxLyrics ||
        query.data?.musicFile?.lyrics) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Copy lyrics
              <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {query.data?.musicFile?.lrcxLyrics && (
              <DropdownMenuItem onSelect={handleCopyLrcx}>
                Copy LRCX
              </DropdownMenuItem>
            )}
            {query.data?.musicFile?.lrcLyrics && (
              <DropdownMenuItem onSelect={handleCopyLrc}>
                Copy LRC
              </DropdownMenuItem>
            )}
            {query.data?.musicFile?.lyrics && (
              <DropdownMenuItem onSelect={handleCopyOriginalLyrics}>
                Copy original lyrics
              </DropdownMenuItem>
            )}
            {query.data?.musicFile?.lyrics?.translationLanguages?.map(
              (lang) => (
                <DropdownMenuItem
                  key={lang}
                  onSelect={() => handleCopyTranslations(lang)}
                >
                  Copy translations {lang ? `in ${lang}` : ""}
                </DropdownMenuItem>
              )
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </>
  );
}
