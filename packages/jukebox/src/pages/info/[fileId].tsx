import { NextComposedLink } from "../../components/Link";
import { getLayout } from "../../components/public/layouts/IndexLayout";
import { Box, Chip } from "@mui/material";
import { useAuthContext } from "../../components/public/AuthContext";
import ButtonRow from "../../components/ButtonRow";
import React from "react";
import { useRouter } from "next/router";
import FileSongInfo from "../../components/public/FileSongInfo";
import { useAppSelector } from "../../redux/public/store";
import { currentSongSelector } from "../../redux/public/playlist";

export default function InformationById() {
  const { user } = useAuthContext();
  const router = useRouter();
  const currentSong = useAppSelector(currentSongSelector);
  const fileId = router.query.fileId ? parseInt(router.query.fileId as string) : null;

  return <Box p={4} pt={0}>
    {currentSong && <FileSongInfo partialFile={currentSong} fileId={fileId} />}
    {user && <ButtonRow>
      {currentSong && <Chip
          label="Edit song" component={NextComposedLink}
          target="_blank" href={`/dashboard/review/${fileId ?? currentSong.id}`}
          clickable variant="outlined" />}
    </ButtonRow>}
  </Box>;
}

// Persisted layout pattern based on the works of Adam Wathan
// https://adamwathan.me/2019/10/17/persistent-layout-patterns-in-nextjs/
InformationById.layout = getLayout;
