"use client";

import { NextComposedLink } from "lyricova-common/components/Link";
import { Box, Chip } from "@mui/material";
import { useAuthContext } from "lyricova-common/components/AuthContext";
import ButtonRow from "../../../../components/ButtonRow";
import React from "react";
import { useRouter } from "next/navigation";
import FileSongInfo from "../../../../components/public/FileSongInfo";
import { useAppSelector } from "../../../../redux/public/store";
import { currentSongSelector } from "../../../../redux/public/playlist";

export default function InformationById({
  params: { fileId },
}: {
  params: { fileId: string };
}) {
  const { user } = useAuthContext();
  const currentSong = useAppSelector(currentSongSelector);
  const fileIdInt = parseInt(fileId);

  return (
    <Box p={4} pt={0}>
      {currentSong && (
        <FileSongInfo partialFile={currentSong} fileId={fileIdInt} />
      )}
      {user && (
        <ButtonRow>
          {currentSong && (
            <Chip
              label="Edit song"
              component={NextComposedLink}
              target="_blank"
              href={`/dashboard/review/${fileIdInt ?? currentSong.id}`}
              clickable
              variant="outlined"
            />
          )}
        </ButtonRow>
      )}
    </Box>
  );
}
