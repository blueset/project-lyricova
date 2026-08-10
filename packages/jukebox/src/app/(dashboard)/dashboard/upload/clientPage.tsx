"use client";

import { Button } from "@lyricova/components/components/ui/button";
import { Progress } from "@lyricova/components/components/ui/progress";
import { filesize } from "filesize";
import {
  CircleCheck,
  CircleX,
  ClipboardPaste,
  FileAudio,
  FolderOpen,
  RotateCcw,
  Trash2,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { NavHeader } from "../NavHeader";
import {
  MAX_UPLOAD_BATCH_FILES,
  uploadFileKey,
  validateUploadFile,
} from "./uploadQueue";

type UploadStatus = "queued" | "uploading" | "success" | "error";

interface UploadResult {
  id: number;
  fileName: string;
  path: string;
  reviewUrl: string;
}

interface UploadQueueItem {
  id: string;
  file: File;
  status: UploadStatus;
  progress: number;
  error?: string;
  result?: UploadResult;
  retryable: boolean;
}

function newQueueId(): string {
  return crypto.randomUUID();
}

function isEditablePasteTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

export default function UploadMusicFiles() {
  const [items, setItems] = useState<UploadQueueItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const itemsRef = useRef<UploadQueueItem[]>([]);
  const uploadGuard = useRef(false);
  const requests = useRef(new Map<string, XMLHttpRequest>());
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      for (const request of requests.current.values()) request.abort();
      requests.current.clear();
    };
  }, []);

  const commitItems = useCallback(
    (update: (current: UploadQueueItem[]) => UploadQueueItem[]) => {
      const next = update(itemsRef.current);
      itemsRef.current = next;
      setItems(next);
    },
    [],
  );

  const enqueueFiles = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;
      const current = itemsRef.current;
      const availableSlots = Math.max(
        0,
        MAX_UPLOAD_BATCH_FILES - current.length,
      );
      const overflow = Math.max(0, files.length - availableSlots);
      const filesToAdd = files.slice(0, availableSlots);

      commitItems((currentItems) => {
        const existingKeys = new Set(
          currentItems.map((item) => uploadFileKey(item.file)),
        );
        const additions: UploadQueueItem[] = [];

        for (const file of filesToAdd) {
          const key = uploadFileKey(file);
          const validationError = validateUploadFile(file);
          const duplicate = existingKeys.has(key);
          existingKeys.add(key);
          additions.push({
            id: newQueueId(),
            file,
            status: validationError || duplicate ? "error" : "queued",
            progress: 0,
            error: duplicate
              ? "This file is already in the queue."
              : validationError ?? undefined,
            retryable: false,
          });
        }
        return [...currentItems, ...additions];
      });
      if (overflow > 0) {
        toast.error(
          `${overflow} file${overflow === 1 ? " was" : "s were"} not added because the queue is limited to 50 files.`,
        );
      }
    },
    [commitItems],
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    noClick: true,
    noKeyboard: true,
    multiple: true,
    onDrop: enqueueFiles,
  });

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (isEditablePasteTarget(event.target)) return;
      const files = Array.from(event.clipboardData?.files ?? []);
      if (files.length === 0) return;
      event.preventDefault();
      enqueueFiles(files);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [enqueueFiles]);

  const updateItem = useCallback(
    (id: string, update: Partial<UploadQueueItem>) => {
      if (!mounted.current) return;
      commitItems((current) =>
        current.map((item) => (item.id === id ? { ...item, ...update } : item)),
      );
    },
    [commitItems],
  );

  const uploadOne = useCallback(
    (item: UploadQueueItem) =>
      new Promise<void>((resolve) => {
        const request = new XMLHttpRequest();
        requests.current.set(item.id, request);
        updateItem(item.id, {
          status: "uploading",
          progress: 0,
          error: undefined,
          result: undefined,
          retryable: false,
        });

        let finished = false;
        const finish = () => {
          if (finished) return;
          finished = true;
          requests.current.delete(item.id);
          resolve();
        };
        request.upload.addEventListener("progress", (event) => {
          const total = event.lengthComputable ? event.total : item.file.size;
          if (total > 0) {
            updateItem(item.id, {
              progress: Math.min(100, (event.loaded / total) * 100),
            });
          }
        });
        request.addEventListener("load", () => {
          let body: Partial<UploadResult> & { message?: string } = {};
          try {
            body = JSON.parse(request.responseText) as typeof body;
          } catch {
            // Non-JSON errors use the HTTP status text below.
          }
          if (
            request.status === 201 &&
            typeof body.id === "number" &&
            typeof body.reviewUrl === "string"
          ) {
            updateItem(item.id, {
              status: "success",
              progress: 100,
              result: body as UploadResult,
            });
          } else {
            updateItem(item.id, {
              status: "error",
              error:
                body.message ||
                request.statusText ||
                `Upload failed with status ${request.status}.`,
              retryable:
                request.status === 408 ||
                request.status === 429 ||
                request.status >= 500,
            });
          }
          finish();
        });
        request.addEventListener("error", () => {
          updateItem(item.id, {
            status: "error",
            error: "Network error while uploading the file.",
            retryable: true,
          });
          finish();
        });
        request.addEventListener("abort", finish);

        const body = new FormData();
        body.append("file", item.file, item.file.name);
        request.open("POST", "/upload/music");
        request.withCredentials = true;
        request.send(body);
      }),
    [updateItem],
  );

  const uploadQueued = useCallback(async () => {
    if (uploadGuard.current) return;
    const queued = itemsRef.current.filter(
      (item) => item.status === "queued",
    );
    if (queued.length === 0) return;
    uploadGuard.current = true;
    setUploading(true);
    let cursor = 0;
    const worker = async () => {
      while (mounted.current && cursor < queued.length) {
        const item = queued[cursor++];
        if (
          !itemsRef.current.some(
            (candidate) =>
              candidate.id === item.id && candidate.status === "queued",
          )
        ) {
          continue;
        }
        await uploadOne(item);
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(3, queued.length) }, () => worker()),
    );
    uploadGuard.current = false;
    if (mounted.current) setUploading(false);
  }, [uploadOne]);

  const queuedCount = useMemo(
    () => items.filter((item) => item.status === "queued").length,
    [items],
  );

  return (
    <>
      <NavHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Upload" },
        ]}
      />
      <div className="h-full mx-4 flex flex-col gap-4 mb-2">
        <div
          {...getRootProps()}
          className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
            isDragActive ? "border-primary bg-primary/5" : "border-border"
          }`}
        >
          <input
            {...getInputProps({
              accept: ".mp3,.flac,.aiff,audio/mpeg,audio/flac,audio/aiff",
            })}
          />
          <Upload className="mx-auto mb-3 size-10 text-muted-foreground" />
          <div className="font-medium">
            Drop MP3, FLAC, or AIFF files here
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            Up to 50 files per queue and 500 MiB per file. You can also paste
            copied music files from the clipboard.
          </div>
          <div className="mt-4 flex justify-center gap-2">
            <Button type="button" variant="outline" onClick={open}>
              <FolderOpen />
              Browse
            </Button>
            <Button
              type="button"
              onClick={uploadQueued}
              disabled={queuedCount === 0 || uploading}
            >
              <Upload />
              Upload {queuedCount > 0 ? `(${queuedCount})` : ""}
            </Button>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <ClipboardPaste className="size-4" />
            No files queued
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <FileAudio className="size-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{item.file.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {filesize(item.file.size)}
                  </div>
                  {item.status === "uploading" && (
                    <div className="mt-2 space-y-1">
                      <Progress
                        className={item.progress >= 100 ? "animate-pulse" : ""}
                        value={item.progress}
                      />
                      <div className="text-xs text-muted-foreground">
                        {item.progress >= 100
                          ? "Processing audio..."
                          : `${Math.round(item.progress)}% uploaded`}
                      </div>
                    </div>
                  )}
                  {item.error && (
                    <div className="mt-1 flex items-start gap-1 text-sm text-destructive">
                      <CircleX className="mt-0.5 size-4 shrink-0" />
                      <span>{item.error}</span>
                    </div>
                  )}
                  {item.status === "success" && item.result && (
                    <div className="mt-1 flex items-center gap-1 text-sm text-green-700 dark:text-green-400">
                      <CircleCheck className="size-4" />
                      <a
                        className="underline underline-offset-2"
                        href={item.result.reviewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Review file #{item.result.id}
                      </a>
                    </div>
                  )}
                </div>
                {item.retryable && item.status === "error" && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    title="Retry"
                    onClick={() =>
                      updateItem(item.id, {
                        status: "queued",
                        progress: 0,
                        error: undefined,
                        retryable: false,
                      })
                    }
                  >
                    <RotateCcw />
                  </Button>
                )}
                {item.status !== "uploading" && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    title="Remove"
                    onClick={() =>
                      commitItems((current) =>
                        current.filter((candidate) => candidate.id !== item.id),
                      )
                    }
                  >
                    <Trash2 />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
