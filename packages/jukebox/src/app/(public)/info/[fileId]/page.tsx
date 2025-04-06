"use client";

import { Box, Chip } from "@mui/material";
import { NextComposedLink, useAuthContext } from "@lyricova/components";
import ButtonRow from "@/components/ButtonRow";
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
    <Box p={4} pt={0}>
      {currentSong && (
        <FileSongInfo partialFile={currentSong} fileId={fileId} />
      )}
      {user && (
        <ButtonRow>
          {currentSong && (
            <Chip
              label="Edit song"
              component={NextComposedLink}
              target="_blank"
              href={`/dashboard/review/${fileId ?? currentSong.id}`}
              clickable
              variant="outlined"
            />
          )}
        </ButtonRow>
      )}
    </Box>
  );
}
