import { useApolloClient, useLazyQuery } from "@apollo/client";
import { graphql } from "@lyricova/components/gql";
import { useCallback, useEffect } from "react";
import { useNamedState } from "../../hooks/useNamedState";
import InfoPanel from "./musicFilesDetails/info";
import CoverArtPanel from "./musicFilesDetails/coverArt";
import LyricsPanel from "./musicFilesDetails/lyrics";
import PlaylistsPanel from "./musicFilesDetails/playlists";
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
import { ProgressButton } from "@lyricova/components/components/ui/progress-button";
import { Separator } from "@lyricova/components/components/ui/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@lyricova/components/components/ui/tabs";

const SINGLE_FILE_DATA = graphql(`
  query DashboardMusicFileDetails($id: Int!) {
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
        utaiteDbId
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
`);

const TOGGLE_NEED_REVIEW_MUTATION = graphql(`
  mutation ToggleNeedReview($fileId: Int!, $needReview: Boolean!) {
    toggleMusicFileReviewStatus(fileId: $fileId, needReview: $needReview) {
      needReview
    }
  }
`);

interface MusicFileDetailsProps {
  fileId?: number;
}

export default function MusicFileDetails({ fileId }: MusicFileDetailsProps) {
  const apolloClient = useApolloClient();

  const [getFile, fileData] = useLazyQuery(SINGLE_FILE_DATA, {
    variables: { id: fileId! },
  });

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
    if (!fileData.data?.musicFile) return;
    const needReview = !fileData.data.musicFile.needReview;
    try {
      await apolloClient.mutate({
        mutation: TOGGLE_NEED_REVIEW_MUTATION,
        variables: { fileId: fileId!, needReview },
      });
      await fileData.refetch();
    } catch (e) {
      console.error("Error occurred while toggling review status.", e);
      toast.error(`Error occurred while toggling review status: ${e}`);
    }
    toggleSubmittingReview(false);
  }, [toggleSubmittingReview, apolloClient, fileData, fileId]);

  const musicFile = fileData.data?.musicFile;

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
                  fileId={fileId!}
                  path={musicFile?.path ?? ""}
                  trackName={musicFile?.trackName ?? ""}
                  trackSortOrder={musicFile?.trackSortOrder ?? ""}
                  artistName={musicFile?.artistName ?? ""}
                  artistSortOrder={
                    musicFile?.artistSortOrder ?? ""
                  }
                  albumName={musicFile?.albumName ?? ""}
                  albumSortOrder={musicFile?.albumSortOrder ?? ""}
                  song={musicFile?.song ?? null}
                  albumId={musicFile?.album?.id ?? null}
                  refresh={fileData.refetch}
                />
              </TabsContent>
              <TabsContent value="cover-art">
                <CoverArtPanel
                  fileId={fileId!}
                  trackName={musicFile?.trackName ?? ""}
                  hasCover={musicFile?.hasCover ?? false}
                  hasSong={(musicFile?.song ?? null) !== null}
                  hasAlbum={(musicFile?.album ?? null) !== null}
                  songCoverUrl={musicFile?.song?.coverUrl ?? null}
                  albumCoverUrl={
                    musicFile?.album?.coverUrl ?? null
                  }
                  refresh={fileData.refetch}
                />
              </TabsContent>
              <TabsContent value="lyrics">
                <LyricsPanel
                  fileId={fileId!}
                  title={musicFile?.trackName ?? ""}
                  artists={musicFile?.artistName ?? ""}
                  lrcLyrics={musicFile?.lrcLyrics}
                  lrcxLyrics={musicFile?.lrcxLyrics}
                  duration={musicFile?.duration ?? 0}
                  songId={musicFile?.song?.id ?? null}
                  refresh={fileData.refetch}
                />
              </TabsContent>
            </CardContent>
            <Separator />
            <CardFooter>
              <CardAction>
                <ProgressButton
                  disabled={!musicFile}
                  progress={submittingReview}
                  variant={
                    musicFile?.needReview ?? false
                      ? "default"
                      : "secondary"
                  }
                  onClick={toggleReviewStatus}
                >
                  {`${
                    musicFile?.needReview
                      ? "Mark as reviewed"
                      : "Mark as need review"
                  }`}
                </ProgressButton>
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
                    fileId={fileId!}
                    playlists={musicFile?.playlists ?? []}
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
                    fileId={fileId!}
                    playCount={musicFile?.playCount}
                    lastPlayed={musicFile?.lastPlayed}
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
