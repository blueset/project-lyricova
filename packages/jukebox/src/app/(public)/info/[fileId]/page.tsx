"use client";

import { NextComposedLink, useAuthContext } from "@lyricova/components";
import { Button } from "@lyricova/components/components/ui/button";
import React from "react";
import FileSongInfo from "@/components/public/FileSongInfo";
import { useAppSelector } from "@/redux/public/store";
import { currentSongSelector } from "@/redux/public/playlist";
import { useParams } from "next/navigation";

export default function InformationById() {
  const { user } = useAuthContext();
  const currentSong = useAppSelector(currentSongSelector);
  const { fileId: fileIdString } = useParams<{ fileId: string }>();
  const fileId = fileIdString ? parseInt(fileIdString as string) : null;

  return (
    <div className="p-4 pt-0">
      {currentSong && (
        <FileSongInfo partialFile={currentSong} fileId={fileId} />
      )}
      {user && currentSong && (
        <Button variant="outline" size="sm" asChild>
          <NextComposedLink
            target="_blank"
            href={`/dashboard/review/${fileId ?? currentSong.id}`}
          >
            Edit song
          </NextComposedLink>
        </Button>
      )}
    </div>
  );
}
