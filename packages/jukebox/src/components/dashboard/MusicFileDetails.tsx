import { gql, useApolloClient, useLazyQuery } from "@apollo/client";
import type { MusicFile } from "@lyricova/api/graphql/types";
import { useCallback, useEffect } from "react";
import { useNamedState } from "../../hooks/useNamedState";
import InfoPanel from "./musicFilesDetails/info";
import { SongFragments } from "@lyricova/components";
import CoverArtPanel from "./musicFilesDetails/coverArt";
import LyricsPanel from "./musicFilesDetails/lyrics";
import PlaylistsPanel from "./musicFilesDetails/playlists";
import type { DocumentNode } from "graphql";
import StatsPanel from "./musicFilesDetails/stats";
import { toast } from "sonner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleToggleButton,
} from "@lyricova/components/components/ui/collapsible";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
  CardFooter,
} from "@lyricova/components/components/ui/card";
import { Button } from "@lyricova/components/components/ui/button";
import { Separator } from "@lyricova/components/components/ui/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@lyricova/components/components/ui/tabs";

const SINGLE_FILE_DATA = gql`
  query ($id: Int!) {
    musicFile(id: $id) {
      id
      path
      trackName
      trackSortOrder
      artistName
      artistSortOrder
      albumName
      albumSortOrder
      songId
      hasCover
      duration
      needReview
      playCount
      lastPlayed

      song {
        ...SelectSongEntry
      }
      album {
        id
        coverUrl
      }

      lrcxLyrics: lyricsText(ext: "lrcx")
      lrcLyrics: lyricsText(ext: "lrc")

      playlists {
        slug
        name
      }
    }
  }

  ${SongFragments.SelectSongEntry}
` as DocumentNode;

const TOGGLE_NEED_REVIEW_MUTATION = gql`
  mutation ($fileId: Int!, $needReview: Boolean!) {
    toggleMusicFileReviewStatus(fileId: $fileId, needReview: $needReview) {
      needReview
    }
  }
` as DocumentNode;

type ExtendedMusicFile = Pick<
  MusicFile,
  | "id"
  | "path"
  | "trackName"
  | "trackSortOrder"
  | "artistName"
  | "artistSortOrder"
  | "albumName"
  | "albumSortOrder"
  | "songId"
  | "hasCover"
  | "song"
  | "album"
  | "duration"
  | "playlists"
  | "needReview"
  | "playCount"
  | "lastPlayed"
> & {
  lrcLyrics?: string;
  lrcxLyrics?: string;
};

interface MusicFileDetailsProps {
  fileId?: number;
}

export default function MusicFileDetails({ fileId }: MusicFileDetailsProps) {
  const apolloClient = useApolloClient();

  const [getFile, fileData] = useLazyQuery<{
    musicFile: ExtendedMusicFile;
  }>(SINGLE_FILE_DATA, { variables: { id: fileId } });

  useEffect(() => {
    if (fileId != null) {
      getFile();
    }
  }, [fileId, getFile]);

  const [submittingReview, toggleSubmittingReview] = useNamedState(
    false,
    "submittingReview"
  );

  const toggleReviewStatus = useCallback(async () => {
    toggleSubmittingReview(true);
    if (!fileData.data) return;
    const needReview = !fileData.data.musicFile.needReview;
    try {
      await apolloClient.mutate({
        mutation: TOGGLE_NEED_REVIEW_MUTATION,
        variables: { fileId, needReview },
      });
      await fileData.refetch();
    } catch (e) {
      console.error("Error occurred while toggling review status.", e);
      toast.error(`Error occurred while toggling review status: ${e}`);
    }
    toggleSubmittingReview(false);
  }, [toggleSubmittingReview, apolloClient, fileData, fileId]);

  useEffect(() => {
    if (document?.title && fileData?.data?.musicFile?.trackName) {
      document.title = `Edit ${fileData?.data?.musicFile?.trackName} – Playlist – Lyricova Jukebox Dashboard`;
    }
  }, [fileData?.data?.musicFile?.trackName]);

  return (
    <>
      <div className="gap-4 grid grid-cols-1 @6xl/dashboard:grid-cols-[auto_30ch] @7xl/dashboard:grid-cols-[auto_40ch]">
        <Tabs defaultValue="info" className="gap-4">
          <TabsList>
            <TabsTrigger value="info">Info</TabsTrigger>
            <TabsTrigger value="cover-art">Cover art</TabsTrigger>
            <TabsTrigger value="lyrics">Lyrics</TabsTrigger>
          </TabsList>
          <Card>
            <CardContent>
              <TabsContent value="info">
                <InfoPanel
                  fileId={fileId}
                  path={fileData.data?.musicFile.path ?? ""}
                  trackName={fileData.data?.musicFile.trackName ?? ""}
                  trackSortOrder={fileData.data?.musicFile.trackSortOrder ?? ""}
                  artistName={fileData.data?.musicFile.artistName ?? ""}
                  artistSortOrder={
                    fileData.data?.musicFile.artistSortOrder ?? ""
                  }
                  albumName={fileData.data?.musicFile.albumName ?? ""}
                  albumSortOrder={fileData.data?.musicFile.albumSortOrder ?? ""}
                  song={fileData.data?.musicFile.song ?? null}
                  albumId={fileData.data?.musicFile.album?.id ?? null}
                  refresh={fileData.refetch}
                />
              </TabsContent>
              <TabsContent value="cover-art">
                <CoverArtPanel
                  fileId={fileId}
                  trackName={fileData.data?.musicFile.trackName ?? ""}
                  hasCover={fileData.data?.musicFile.hasCover ?? false}
                  hasSong={(fileData.data?.musicFile.song ?? null) !== null}
                  hasAlbum={(fileData.data?.musicFile.album ?? null) !== null}
                  songCoverUrl={fileData.data?.musicFile.song?.coverUrl ?? null}
                  albumCoverUrl={
                    fileData.data?.musicFile.album?.coverUrl ?? null
                  }
                  refresh={fileData.refetch}
                />
              </TabsContent>
              <TabsContent value="lyrics">
                <LyricsPanel
                  fileId={fileId}
                  title={fileData.data?.musicFile.trackName ?? ""}
                  artists={fileData.data?.musicFile.artistName ?? ""}
                  lrcLyrics={fileData.data?.musicFile.lrcLyrics}
                  lrcxLyrics={fileData.data?.musicFile.lrcxLyrics}
                  duration={fileData.data?.musicFile.duration ?? 0}
                  songId={fileData.data?.musicFile.song?.id ?? null}
                  refresh={fileData.refetch}
                />
              </TabsContent>
            </CardContent>
            <Separator />
            <CardFooter>
              <CardAction>
                <Button
                  disabled={!fileData.data || submittingReview}
                  variant={
                    fileData.data?.musicFile.needReview ?? false
                      ? "default"
                      : "secondary"
                  }
                  onClick={toggleReviewStatus}
                >
                  {`${
                    fileData.data?.musicFile.needReview
                      ? "Mark as reviewed"
                      : "Mark as need review"
                  }`}
                </Button>
              </CardAction>
            </CardFooter>
          </Card>
        </Tabs>
        <div className="flex flex-col gap-4">
          <Collapsible defaultOpen asChild className="gap-0">
            <Card className="py-2">
              <CardHeader className="items-center px-6">
                <CardTitle>Playlists</CardTitle>
                <CardAction>
                  <CollapsibleToggleButton />
                </CardAction>
              </CardHeader>
              <CollapsibleContent>
                <Separator className="my-2" />
                <CardContent className="py-4">
                  <PlaylistsPanel
                    fileId={fileId}
                    playlists={fileData.data?.musicFile.playlists ?? []}
                    refresh={fileData.refetch}
                  />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
          <Collapsible defaultOpen asChild className="gap-0">
            <Card className="py-2">
              <CardHeader className="items-center px-6">
                <CardTitle>Stats</CardTitle>
                <CardAction>
                  <CollapsibleToggleButton />
                </CardAction>
              </CardHeader>
              <CollapsibleContent>
                <Separator className="my-2" />
                <CardContent className="py-4">
                  <StatsPanel
                    fileId={fileId}
                    playCount={fileData.data?.musicFile.playCount}
                    lastPlayed={fileData.data?.musicFile.lastPlayed}
                    refresh={fileData.refetch}
                  />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>
      </div>
    </>
  );
}
