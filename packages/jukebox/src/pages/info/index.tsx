import { NextComposedLink } from "lyricova-common/components/Link";
import { getLayout } from "../../components/public/layouts/IndexLayout";
import { Box, Chip } from "@mui/material";
import { useAuthContext } from "lyricova-common/components/AuthContext";
import ButtonRow from "../../components/ButtonRow";
import React from "react";
import FileSongInfo from "../../components/public/FileSongInfo";
import { useAppSelector } from "../../redux/public/store";
import { currentSongSelector } from "../../redux/public/playlist";

export default function Information() {
  const { user } = useAuthContext();
  const currentSong = useAppSelector(currentSongSelector);

  return (
    <Box p={4} pt={0}>
      {currentSong && <FileSongInfo partialFile={currentSong} fileId={null} />}
      {user && (
        <ButtonRow>
          {currentSong && (
            <Chip
              label="Edit music file"
              component={NextComposedLink}
              target="_blank"
              href={`/dashboard/review/${currentSong.id}`}
              clickable
              variant="outlined"
            />
          )}
          <Chip
            label="Admin panel"
            component={NextComposedLink}
            target="_blank"
            href="login"
            clickable
            variant="outlined"
          />
          <Chip
            label="Log out"
            component={NextComposedLink}
            href="logout"
            clickable
            variant="outlined"
          />
        </ButtonRow>
      )}
    </Box>
  );
}

// Persisted layout pattern based on the works of Adam Wathan
// https://adamwathan.me/2019/10/17/persistent-layout-patterns-in-nextjs/
Information.layout = getLayout;
