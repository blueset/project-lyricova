import type {
  ChangeEvent,
  Dispatch,
  FormEvent,
  ReactNode,
  SetStateAction,
} from "react";
import { useCallback } from "react";
import { useNamedState } from "../../hooks/useNamedState";
import { gql, useApolloClient, useLazyQuery } from "@apollo/client";
import { toast } from "sonner";
import filesize from "filesize";
import { ExternalLink } from "lucide-react";
import { NextComposedLink } from "@lyricova/components";
import { swapExt } from "@/frontendUtils/path";
import type { DocumentNode } from "graphql";
import { MusicFile, YouTubeDlProgressType } from "@lyricova/api/graphql/types";
import {
  Step,
  StepContent,
  StepLabel,
  Stepper,
} from "@lyricova/components/components/ui/stepper";
import { Badge } from "@lyricova/components/components/ui/badge";
import { Button } from "@lyricova/components/components/ui/button";
import { ProgressButton } from "@lyricova/components/components/ui/progress-button";
import { Input } from "@lyricova/components/components/ui/input";
import { Switch } from "@lyricova/components/components/ui/switch";
import {
  Alert,
  AlertDescription,
} from "@lyricova/components/components/ui/alert";
import { Progress } from "@lyricova/components/components/ui/progress";
import { Label } from "@lyricova/components/components/ui/label";
import { cn } from "@lyricova/components/utils";
import { PVContract, SongForApiContract } from "@/types/vocadb";

const YOUTUBE_DL_INFO_QUERY = gql`
  query ($url: String!) {
    youtubeDlGetInfo(url: $url)
  }
` as DocumentNode;

const YOUTUBE_DL_DOWNLOAD_MUTATION = gql`
  mutation (
    $url: String!
    $filename: String
    $overwrite: Boolean
    $sessionId: String
  ) {
    youtubeDlDownloadAudio(
      url: $url
      options: { filename: $filename, overwrite: $overwrite }
      sessionId: $sessionId
    )
  }
` as DocumentNode;

const YOUTUBE_DL_DOWNLOAD_PROGRESS_SUBSCRIPTION = gql`
  subscription YouTubeDlDownloadProgress($sessionId: String!) {
    youTubeDlDownloadProgress(sessionId: $sessionId) {
      ... on YouTubeDlProgressDone {
        type
      }
      ... on YouTubeDlProgressError {
        type
        message
      }
      ... on YouTubeDlProgressValue {
        type
        current
        total
        speed
        eta
      }
      ... on YouTubeDlProgressMessage {
        type
        message
      }
    }
  }
`;

const SINGLE_FILE_SCAN_MUTATION = gql`
  mutation ($path: String!) {
    scanByPath(path: $path) {
      id
    }
  }
` as DocumentNode;

// Fetch song by internal DB id (used optimistically with VocaDB id; if not found we'll enrol)
const SONG_QUERY = gql`
  query ($id: Int!) {
    song(id: $id) {
      id
    }
  }
` as DocumentNode;

// Enrol a song from VocaDB
const ENROL_SONG_FROM_VOCADB_MUTATION = gql`
  mutation ($songId: Int!) {
    enrolSongFromVocaDB(songId: $songId) {
      id
    }
  }
` as DocumentNode;

// Get existing tag fields for a music file
const MUSIC_FILE_FIELDS_QUERY = gql`
  query ($id: Int!) {
    musicFile(id: $id) {
      id
      trackName
      trackSortOrder
      albumName
      albumSortOrder
      artistName
      artistSortOrder
    }
  }
` as DocumentNode;

// Write tags to a music file (attach songId while preserving other fields)
const WRITE_TAGS_TO_MUSIC_FILE_MUTATION = gql`
  mutation ($id: Int!, $data: MusicFileInput!) {
    writeTagsToMusicFile(id: $id, data: $data) {
      id
    }
  }
` as DocumentNode;

interface YouTubeDlInfo {
  fulltitle: string;
  _filename: string;
  uploader: string;
  thumbnail: string;
  duration: number;
  duration_string: string;
  formats: {
    format: string;
    filesize: number;
    format_note: string;
    ext: string;
    format_id: string;
    abr?: number;
    acodec: string;
  }[];
}

interface Props {
  step: number;
  setStep: Dispatch<SetStateAction<number>>;
  firstStep: ReactNode;
}

export default function YouTubeDlDownloadSteps({
  step,
  setStep,
  firstStep,
}: Props) {
  const apolloClient = useApolloClient();

  const [videoURL, setVideoURL] = useNamedState("", "videoURL");
  const [filename, setFilename] = useNamedState("", "filename");
  const [overwrite, toggleOverwrite] = useNamedState(false, "overwrite");
  const [downloadProgress, setDownloadProgress] = useNamedState<number | null>(
    null,
    "downloadProgress"
  );
  const [downloadInfo, setDownloadInfo] = useNamedState("", "downloadInfo");

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setVideoURL(event.target.value);
    },
    [setVideoURL]
  );

  const handleFilename = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setFilename(event.target.value);
    },
    [setFilename]
  );

  const handleOverwrite = useCallback(
    (checked: boolean) => {
      toggleOverwrite(checked);
    },
    [toggleOverwrite]
  );

  const [fetchInfo, fetchInfoQuery] = useLazyQuery<{
    youtubeDlGetInfo: YouTubeDlInfo;
  }>(YOUTUBE_DL_INFO_QUERY);
  const fetchInfoQueryData = fetchInfoQuery?.data?.youtubeDlGetInfo;
  const handleVerify = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      const result = await fetchInfo({ variables: { url: videoURL } });
      setStep((v) => v + 1);
      if (result?.data?.youtubeDlGetInfo) {
        setFilename(swapExt(result.data.youtubeDlGetInfo._filename, ".mp3"));
      }
      return false;
    },
    [fetchInfo, videoURL, setStep, setFilename]
  );

  /** Download state. Null = no result. >= 0, -1: Fail */
  const [downloadState, setDownloadState] = useNamedState<number | null>(
    null,
    "downloadState"
  );

  const downloadFile = useCallback(async () => {
    setStep((v) => v + 1);
    setDownloadState(null);

    try {
      const sessionId = `${Math.random()}`;
      const outcomePromise = apolloClient.mutate<{
        youtubeDlDownloadAudio: string | null;
      }>({
        mutation: YOUTUBE_DL_DOWNLOAD_MUTATION,
        variables: { url: videoURL, filename, overwrite, sessionId },
      });

      // Subscribe to download progress.
      const subscription = apolloClient.subscribe<{
        youTubeDlDownloadProgress: YouTubeDlProgressType;
      }>({
        query: YOUTUBE_DL_DOWNLOAD_PROGRESS_SUBSCRIPTION,
        variables: { sessionId },
      });
      const zenSubscription = subscription.subscribe({
        start(subscription) {
          console.log("subscription started", subscription);
        },
        next(x) {
          console.log("subscription event", x);
          if (x.data.youTubeDlDownloadProgress?.type === "progress") {
            const progress = x.data.youTubeDlDownloadProgress;
            setDownloadProgress((progress.current / progress.total) * 100);
            setDownloadInfo(
              `${progress.current}/${progress.total}, ${progress.speed}, ETA: ${progress.eta}`
            );
          } else if (x.data.youTubeDlDownloadProgress?.type === "message") {
            setDownloadProgress(null);
            setDownloadInfo(x.data.youTubeDlDownloadProgress.message);
          } else {
            setDownloadProgress(null);
            setDownloadInfo("");
          }
        },
        error(err) {
          console.log(`Finished with error: ${err}`);
        },
        complete() {
          console.log("Finished");
        },
      });

      const outcome = await outcomePromise;
      zenSubscription.unsubscribe();
      const filePath = outcome.data.youtubeDlDownloadAudio;
      if (filePath === null) {
        toast.error(`Failed to download ${videoURL} as ${filename}`);
        setDownloadState(-1);
        return;
      }

      // Scan the file downloaded.
      const scanOutcome = await apolloClient.mutate<{
        scanByPath: { id: number };
      }>({
        mutation: SINGLE_FILE_SCAN_MUTATION,
        variables: { path: filePath },
      });
      setDownloadState(scanOutcome.data.scanByPath.id);

      // Try to enrich metadata via VocaDB if possible.
      try {
        setDownloadProgress(null);
        setDownloadInfo("Resolving PV on VocaDB…");
        // 1) Resolve PV service/id from the original video URL
        const pvResolveResp = await fetch(
          `https://vocadb.net/api/pvs/?pvUrl=${encodeURIComponent(videoURL)}`
        );
        if (!pvResolveResp.ok) throw new Error("PV resolve failed");
        const pvResolveJson: PVContract = await pvResolveResp.json();
        const pvService: string | undefined = pvResolveJson.service;
        const pvId: string | undefined = pvResolveJson.pvId;
        if (!pvService || !pvId) throw new Error("PV service/id not found");
        setDownloadProgress(null);
        setDownloadInfo(
          `Resolved PV: service=${pvService}, id=${pvId}. Fetching song…`
        );

        // 2) Get song by PV to obtain VocaDB song id
        const songByPvResp = await fetch(
          `https://vocadb.net/api/songs/byPv?pvService=${encodeURIComponent(
            pvService
          )}&pvId=${encodeURIComponent(pvId)}`
        );
        if (!songByPvResp.ok) throw new Error("Song by PV fetch failed");
        const songByPvJson: SongForApiContract = await songByPvResp.json();
        const vocaSongId: number | undefined = songByPvJson.id;
        if (!vocaSongId) throw new Error("VocaDB song id not found");
        setDownloadProgress(null);
        setDownloadInfo(
          `VocaDB song #${vocaSongId} found. Checking local database…`
        );

        // 3) Check if the song already exists in our DB; if not, enrol it
        let internalSongId: number | undefined;
        try {
          const existing = await apolloClient.query<{
            song: { id: number } | null;
          }>({
            query: SONG_QUERY,
            variables: { id: vocaSongId },
            fetchPolicy: "no-cache",
          });
          internalSongId = existing?.data?.song?.id ?? undefined;
        } catch {
          // Ignore errors; proceed to enrol
        }
        if (!internalSongId) {
          setDownloadProgress(null);
          setDownloadInfo(
            `Song not found locally. Enrolling from VocaDB (#${vocaSongId})…`
          );
          const enrol = await apolloClient.mutate<{
            enrolSongFromVocaDB: { id: number };
          }>({
            mutation: ENROL_SONG_FROM_VOCADB_MUTATION,
            variables: { songId: vocaSongId },
          });
          internalSongId = enrol.data?.enrolSongFromVocaDB?.id;
        }

        // If still no internal song id, skip subsequent steps silently
        if (!internalSongId) throw new Error("Internal song id unavailable");
        setDownloadProgress(null);
        setDownloadInfo(`Using song #${internalSongId}. Reading file tags…`);

        // 4) Read existing tag fields of the music file
        const fileId = scanOutcome.data.scanByPath.id;
        const fileData = await apolloClient.query<{
          musicFile: MusicFile | null;
        }>({
          query: MUSIC_FILE_FIELDS_QUERY,
          variables: { id: fileId },
          fetchPolicy: "no-cache",
        });
        const mf = fileData.data.musicFile;
        if (!mf) throw new Error("Music file not found after scan");
        setDownloadProgress(null);
        setDownloadInfo("Writing tags to file…");

        // 5) Write tags: set songId and preserve existing fields
        await apolloClient.mutate({
          mutation: WRITE_TAGS_TO_MUSIC_FILE_MUTATION,
          variables: {
            id: fileId,
            data: {
              songId: internalSongId,
              trackName: mf.trackName ?? undefined,
              trackSortOrder: mf.trackSortOrder ?? undefined,
              albumName: mf.albumName ?? undefined,
              albumSortOrder: mf.albumSortOrder ?? undefined,
              artistName: mf.artistName ?? undefined,
              artistSortOrder: mf.artistSortOrder ?? undefined,
            },
          },
        });
        setDownloadProgress(null);
        setDownloadInfo("Tags updated.");
      } catch (err) {
        // Skip everything below on failure; just log and continue
        console.debug("VocaDB enrichment skipped:", err);
        setDownloadProgress(null);
        setDownloadInfo("Skipped VocaDB enrichment.");
      }

      toast.success(
        `File downloaded with database ID ${scanOutcome.data.scanByPath.id} and path ${filePath}.`,
        {
          action: {
            label: "Review file",
            onClick: () =>
              window.open(
                `/dashboard/review/${scanOutcome.data.scanByPath.id}`,
                "_blank"
              ),
          },
        }
      );
    } catch (e) {
      console.error("Error occurred while downloading file", e);
      toast.error(`Error occurred while downloading file: ${e}`);
      setStep((v) => v - 1);
    }
  }, [
    apolloClient,
    filename,
    overwrite,
    setDownloadInfo,
    setDownloadProgress,
    setDownloadState,
    setStep,
    videoURL,
  ]);

  return (
    <Stepper activeStep={step} orientation="vertical">
      {firstStep}
      <Step key="youtube-dl-1">
        <StepLabel>
          {step <= 1 ? (
            <>
              Download from <code>yt-dlp</code>
            </>
          ) : (
            <>
              Download from <code>{videoURL}</code>
            </>
          )}
        </StepLabel>
        <StepContent>
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                value={videoURL}
                onChange={handleChange}
                className="w-full"
              />
            </div>
            <div className="flex gap-2">
              <ProgressButton
                progress={fetchInfoQuery.loading}
                type="submit"
                variant="default"
              >
                Verify
              </ProgressButton>
              <Button
                disabled={fetchInfoQuery.loading}
                variant="outline"
                onClick={() => setStep((v) => v - 1)}
              >
                Back
              </Button>
            </div>
          </form>
        </StepContent>
      </Step>
      <Step key="youtube-dl-2">
        <StepLabel>Verify info</StepLabel>
        <StepContent>
          {fetchInfoQuery.loading ? (
            <Alert>
              <AlertDescription>Loading...</AlertDescription>
            </Alert>
          ) : fetchInfoQuery.error ? (
            <Alert variant="destructive">
              <AlertDescription>
                Error: {`${fetchInfoQuery.error}`}
              </AlertDescription>
            </Alert>
          ) : fetchInfoQueryData ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <img
                  src={fetchInfoQueryData.thumbnail}
                  alt={fetchInfoQueryData.fulltitle}
                  className="h-16 rounded"
                />
                <div>
                  <p className="font-medium">
                    {fetchInfoQueryData.fulltitle} (
                    {fetchInfoQueryData.duration_string})
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {fetchInfoQueryData.uploader}
                  </p>
                </div>
              </div>
              <p>
                Filename (video): <code>{fetchInfoQueryData._filename}</code>
              </p>
              <div className="flex flex-wrap gap-2">
                {fetchInfoQueryData.formats
                  .filter((v) => v.abr)
                  .map((v) => {
                    let badgeLabel = v.format;
                    if (v.abr) {
                      badgeLabel = `${badgeLabel}, ♪${v.abr}k@[${
                        v.acodec || "Unknown codec"
                      }]`;
                    }
                    badgeLabel = `${badgeLabel}, ${
                      v.filesize ? filesize(v.filesize) : "Unknown size"
                    }, ${v.ext}`;
                    return (
                      <Badge key={v.format_id} variant="secondary">
                        {badgeLabel}
                      </Badge>
                    );
                  })}
              </div>
            </div>
          ) : (
            "... how did you get there?"
          )}
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="filename">Filename</Label>
              <Input id="filename" value={filename} onChange={handleFilename} />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="overwrite"
                checked={overwrite}
                onCheckedChange={handleOverwrite}
              />
              <Label htmlFor="overwrite">
                Overwrite existing file with same name
              </Label>
            </div>
            <div className="flex gap-2">
              <ProgressButton
                variant="default"
                onClick={downloadFile}
                progress={!fetchInfoQuery.data}
              >
                Download
              </ProgressButton>
              <Button variant="outline" onClick={() => setStep((v) => v - 1)}>
                Back
              </Button>
            </div>
          </div>
        </StepContent>
      </Step>
      <Step key="youtube-dl-3">
        <StepLabel>
          {step !== 3
            ? "Download"
            : downloadState === null
            ? "Downloading..."
            : "Download outcome"}
        </StepLabel>
        <StepContent>
          {downloadState === null && (
            <div className="space-y-2">
              <Progress
                value={downloadProgress ?? 0}
                className={cn(downloadProgress === null && "animate-pulse")}
              />
              <p className="text-sm text-muted-foreground">{downloadInfo}</p>
            </div>
          )}
          <div className="flex gap-2 mt-4">
            <Button
              disabled={
                downloadState === null ||
                downloadState === undefined ||
                downloadState < 0
              }
              variant="default"
              asChild
            >
              <NextComposedLink href={`/dashboard/review/${downloadState}`}>
                <ExternalLink className="mr-2" />
                Review file
              </NextComposedLink>
            </Button>
            <Button variant="outline" onClick={() => setStep((v) => v - 1)}>
              Back
            </Button>
            <Button variant="outline" onClick={() => setStep(0)}>
              Go to first step
            </Button>
          </div>
        </StepContent>
      </Step>
    </Stepper>
  );
}
