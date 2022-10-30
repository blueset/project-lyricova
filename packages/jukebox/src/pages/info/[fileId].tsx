import { NextComposedLink } from "../../components/Link";
import { getLayout } from "../../components/public/layouts/IndexLayout";
import { Box, Chip } from "@mui/material";
import { useAuthContext } from "../../components/public/AuthContext";
import { useAppContext } from "../../components/public/AppContext";
import ButtonRow from "../../components/ButtonRow";
import React from "react";
import { useRouter } from "next/router";
import FileSongInfo from "../../components/public/FileSongInfo";

export default function InformationById() {
  const { user } = useAuthContext();
  const { playlist } = useAppContext();
  const router = useRouter();
  const currentSong = playlist.getCurrentSong();
  const fileId = router.query.fileId ? parseInt(router.query.fileId as string) : null;

  return <Box p={4} pt={0}>
    {currentSong && <FileSongInfo partialFile={currentSong} fileId={fileId} />}
    {user && <ButtonRow>
      {currentSong && <Chip
          label="Edit song" component={NextComposedLink}
          target="_blank" href={`/dashboard/review/${currentSong.id}`}
          clickable variant="outlined" />}
    </ButtonRow>}
  </Box>;
}

// Persisted layout pattern based on the works of Adam Wathan
// https://adamwathan.me/2019/10/17/persistent-layout-patterns-in-nextjs/
InformationById.layout = getLayout;
