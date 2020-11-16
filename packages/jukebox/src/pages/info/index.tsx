import { NextComposedLink } from "../../components/Link";
import { getLayout } from "../../components/public/layouts/IndexLayout";
import { Box, Chip } from "@material-ui/core";
import { useAuthContext } from "../../components/public/AuthContext";
import { useAppContext } from "../../components/public/AppContext";
import ButtonRow from "../../components/ButtonRow";
import React from "react";
import { useRouter } from "next/router";
import FileSongInfo from "../../components/public/FileSongInfo";

export default function Information() {
  const { user } = useAuthContext();
  const { playlist } = useAppContext();
  const currentSong = playlist.getCurrentSong();

  return <Box p={4} pt={0}>
    {currentSong && <FileSongInfo partialFile={currentSong} fileId={null} />}
    {user && <ButtonRow>
      {currentSong && <Chip
          label="Edit song" component={NextComposedLink}
          target="_blank" href={`/dashboard/review/${currentSong.id}`}
          clickable variant="outlined" />}
        <Chip label="Admin panel" component={NextComposedLink} target="_blank" href="login" clickable
              variant="outlined" />
        <Chip label="Log out" component={NextComposedLink} href="logout" clickable variant="outlined" />
    </ButtonRow>}
  </Box>;
}

// Persisted layout pattern based on the works of Adam Wathan
// https://adamwathan.me/2019/10/17/persistent-layout-patterns-in-nextjs/
Information.layout = getLayout;
