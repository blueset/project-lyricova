"use client";

import { useAuthContext } from "@lyricova/components";
import { Button } from "@lyricova/components/components/ui/button";
import React from "react";
import FileSongInfo from "@/components/public/FileSongInfo";
import { useAppSelector } from "@/redux/public/store";
import { currentSongSelector } from "@/redux/public/playlist";
import Link from "next/link";

export default function Information() {
  const { user } = useAuthContext();
  const currentSong = useAppSelector(currentSongSelector);

  return (
    <div className="px-4 pb-4">
      {currentSong && <FileSongInfo partialFile={currentSong} fileId={null} />}

      <div className="flex flex-row gap-2 flex-wrap">
        {currentSong?.id && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/info/${currentSong?.id ?? ""}`} target="_blank">
              Permalink
            </Link>
          </Button>
        )}
        {user && (
          <>
            {currentSong && (
              <Button asChild variant="outline" size="sm">
                <Link
                  href={`/dashboard/review/${currentSong.id}`}
                  target="_blank"
                >
                  Edit music file
                </Link>
              </Button>
            )}
            <Button asChild variant="outline" size="sm">
              <Link href="login" target="_blank">
                Admin panel
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="logout">Log out</Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
