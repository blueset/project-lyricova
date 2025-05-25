"use client";

import { NextComposedLink, useAuthContext } from "@lyricova/components";
import { Button } from "@lyricova/components/components/ui/button";
import React from "react";
import FileSongInfo from "@/components/public/FileSongInfo";
import { useParams } from "next/navigation";
import { MusicFileActions } from "./MusicFileActions";

export default function InformationById() {
  const { user } = useAuthContext();
  const { fileId: fileIdString } = useParams<{ fileId: string }>();
  const fileId = fileIdString ? parseInt(fileIdString as string) : null;

  return (
    <div className="p-4 pt-0">
      {fileId && <FileSongInfo fileId={fileId} />}
      <div className="flex flex-row gap-2 flex-wrap">
        {user && (
          <Button variant="outline" size="sm" asChild>
            <NextComposedLink
              target="_blank"
              href={`/dashboard/review/${fileId}`}
            >
              Edit song
            </NextComposedLink>
          </Button>
        )}
        <MusicFileActions fileId={fileId} />
      </div>
    </div>
  );
}
