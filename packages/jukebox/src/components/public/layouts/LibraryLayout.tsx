import { ChangeEvent, ReactNode } from "react";
import { getLayout as getIndexLayout } from "./IndexLayout";
import { AppBar, Box, Paper, Tab, Tabs } from "@mui/material";
import { useRouter } from "next/router";
import { makeStyles } from "@mui/material/styles";

export function LibraryLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const match = router.pathname.match(/^\/library\/(\w+)\/?.*/);
  const tabBarValue = match ? match[1] : "tracks";

  const handleChange = (event: ChangeEvent<unknown>, newValue: string) => {
    return router.push(`/library/${newValue}`);
  };

  return <Paper sx={{
    height: "100%",
    marginLeft: 4,
    marginRight: 4,
    backgroundColor: "background.default",
    display: "flex",
    flexDirection: "column"
  }}>
      <AppBar position="static" color="default">
        <Tabs value={tabBarValue} onChange={handleChange}
              aria-label="Library sections" textColor="primary" indicatorColor="primary"
              variant="scrollable">
          <Tab label="Tracks" value="tracks" />
          <Tab label="Albums" value="albums" />
          <Tab label="Producers" value="producers" />
          <Tab label="Vocalists" value="vocalists" />
          <Tab label="Playlists" value="playlists" />
        </Tabs>
      </AppBar>
      <Box sx={{ flexGrow: 1, flexBasis: 0, overflow: "auto", }}>{children}</Box>
    </Paper>
  ;
}

export const getLayout = (page: ReactNode) => getIndexLayout(<LibraryLayout>{page}</LibraryLayout>);