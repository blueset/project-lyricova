import { toast } from "sonner";
import { useNamedState } from "../../../hooks/useNamedState";
import type { ChangeEvent } from "react";
import { useCallback, useEffect } from "react";
import axios from "axios";
import { useDropzone } from "react-dropzone";
import { useAuthContext } from "@lyricova/components";
import { Music, ImageOff } from "lucide-react";
import { Button } from "@lyricova/components/components/ui/button";
import { Input } from "@lyricova/components/components/ui/input";
import { cn } from "@lyricova/components/utils";

interface SelectedImage {
  url?: string;
  blob?: Blob;
}

interface Props {
  fileId: number;
  trackName: string;
  hasCover: boolean;
  hasSong: boolean;
  hasAlbum: boolean;
  songCoverUrl?: string;
  albumCoverUrl?: string;
  refresh: () => unknown | Promise<unknown>;
}

export default function CoverArtPanel({
  fileId,
  hasCover,
  trackName,
  hasSong,
  songCoverUrl,
  hasAlbum,
  albumCoverUrl,
  refresh,
}: Props) {
  const [selectedImage, setSelectedImage] = useNamedState<SelectedImage>(
    null,
    "selectedImage"
  );
  const [urlField, setUrlField] = useNamedState<string>("", "urlField");
  const [isSubmitting, toggleSubmitting] = useNamedState(false, "isSubmitting");
  const [cacheBustingToken, setCacheBustingToken] = useNamedState(
    new Date().getTime(),
    "cacheBustingToken"
  );

  // Apply URL.
  const setImageUrl = useCallback(
    (url: string) => () => setSelectedImage({ url }),
    [setSelectedImage]
  );
  const handleUrlFieldOnChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setUrlField(event.target.value);
    },
    [setUrlField]
  );

  // Apply file selection
  const handleFileFieldOnChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (event.target.files.length > 0) {
        setSelectedImage({ blob: event.target.files[0] });
      }
    },
    [setSelectedImage]
  );

  // Drag and drop file
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        setSelectedImage({ blob: acceptedFiles[0] });
      }
    },
    [setSelectedImage]
  );
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    noClick: true,
    noKeyboard: true,
    onDrop,
  });

  // File from pasteboard
  const onPaste = useCallback(
    (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item.type.startsWith("image/")) continue;
        const blob = item.getAsFile();
        if (!blob) continue;
        setSelectedImage({ blob });
        break;
      }
    },
    [setSelectedImage]
  );
  useEffect(() => {
    const thisOnPaste = onPaste;
    window.addEventListener("paste", thisOnPaste);
    return () => {
      window.removeEventListener("paste", thisOnPaste);
    };
  }, [onPaste]);

  // Submit button action
  const authContext = useAuthContext();
  const applyCover = useCallback(async () => {
    toggleSubmitting(true);

    if (!selectedImage) return;
    const token = authContext.jwt();
    const data = new FormData();

    if (selectedImage.url) {
      data.append("url", selectedImage.url);
    } else if (selectedImage.blob) {
      data.append("cover", selectedImage.blob);
    } else {
      return;
    }

    try {
      const result = await axios.patch(`/api/files/${fileId}/cover`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      if (result.status === 200) {
        toast.success("Cover image updated.");
        await refresh();
        setCacheBustingToken(new Date().getTime());
        toggleSubmitting(false);
      } else {
        toast.error(result.data.message);
        toggleSubmitting(false);
      }
    } catch (e) {
      toast.error(`Error occurred while saving cover: ${e}`);
      toggleSubmitting(false);
    }
  }, [
    authContext,
    fileId,
    refresh,
    selectedImage,
    setCacheBustingToken,
    toggleSubmitting,
  ]);

  return (
    <div
      className="relative grid grid-cols-1 @2xl/dashboard:grid-cols-2 @4xl/dashboard:grid-cols-4 gap-6"
      {...getRootProps()}
    >
      {isDragActive && (
        <div className="absolute inset-0 flex items-center justify-center bg-secondary/80 border-2 border-secondary z-10">
          Drag here to set cover.
        </div>
      )}
      <div>
        <h2 className="text-lg font-semibold mb-3">Current cover</h2>
        <div className="relative w-full pt-[100%] mb-2 bg-secondary rounded-lg overflow-hidden">
          {hasCover ? (
            <img
              src={`/api/files/${fileId}/cover?t=${cacheBustingToken}`}
              alt="Cover art"
              className="absolute inset-0 w-full h-full object-contain"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              {hasCover ? <Music /> : <ImageOff />}
            </div>
          )}
        </div>
        <Button asChild variant="outline" className="w-full">
          <a
            href={`https://www.google.com/search?q=${encodeURIComponent(
              trackName
            )}`}
            target="_blank"
            rel="noreferrer"
          >
            Search on Google
          </a>
        </Button>
      </div>
      <div>
        <h2 className="text-lg font-semibold mb-3">From song entity</h2>
        <div className="relative w-full pt-[100%] mb-2 bg-secondary rounded-lg overflow-hidden">
          {hasSong ? (
            <img
              src={songCoverUrl}
              alt="Song cover art"
              className="absolute inset-0 w-full h-full object-contain"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              {hasSong ? <Music /> : <ImageOff />}
            </div>
          )}
        </div>
        <Button
          variant="outline"
          className="w-full"
          disabled={!hasSong || !songCoverUrl}
          onClick={setImageUrl(songCoverUrl)}
        >
          Use this
        </Button>
      </div>
      <div>
        <h2 className="text-lg font-semibold mb-3">From album entity</h2>
        <div className="relative w-full pt-[100%] mb-2 bg-secondary rounded-lg overflow-hidden">
          {hasAlbum ? (
            <img
              src={albumCoverUrl}
              alt="Album cover art"
              className="absolute inset-0 w-full h-full object-contain"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              {hasAlbum ? <Music /> : <ImageOff />}
            </div>
          )}
        </div>
        <Button
          variant="outline"
          className="w-full"
          disabled={!hasAlbum || !albumCoverUrl}
          onClick={setImageUrl(albumCoverUrl)}
        >
          Use this
        </Button>
      </div>
      <div>
        <h2 className="text-lg font-semibold mb-3">Cover to upload</h2>
        <div className="relative w-full pt-[100%] mb-2 bg-secondary rounded-lg overflow-hidden">
          {selectedImage ? (
            <img
              src={selectedImage.url || URL.createObjectURL(selectedImage.blob)}
              alt="Selected cover art"
              className="absolute inset-0 w-full h-full object-contain"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              {hasAlbum ? <Music /> : <ImageOff />}
            </div>
          )}
        </div>
        <Button
          variant="default"
          className="w-full"
          disabled={selectedImage === null || isSubmitting}
          onClick={applyCover}
        >
          {isSubmitting ? "Applying..." : "Apply"}
        </Button>
      </div>
      <div className="col-span-full">
        <div className="flex items-center gap-4">
          <Input
            placeholder="Import from URL"
            value={urlField}
            onChange={handleUrlFieldOnChange}
          />
          <Button
            variant="outline"
            disabled={!urlField}
            onClick={setImageUrl(urlField)}
          >
            Import
          </Button>
          <Button variant="outline" className="relative" asChild>
            <label>
              Select file
              <input
                type="file"
                className="hidden"
                onChange={handleFileFieldOnChange}
                {...(getInputProps() as object)}
              />
            </label>
          </Button>
        </div>
      </div>
    </div>
  );
}
