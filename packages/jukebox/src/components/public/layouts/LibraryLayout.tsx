import { ChangeEvent, ReactNode } from "react";
import IndexLayout from "./IndexLayout";
import { AppBar, Box, Paper, Tab, Tabs } from "@material-ui/core";
import { useRouter } from "next/router";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles((theme) => ({
  paper: {
    height: "100%",
    margin: theme.spacing(0, 4),
    backgroundColor: theme.palette.background.default,
    display: "flex",
    flexDirection: "column"
  },
  content: {
    flexGrow: 1,
    flexBasis: 0,
    overflow: "auto",
  }
}));

export function LibraryLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const match = router.pathname.match(/^\/library\/(\w+)\/?.*/);
  const tabBarValue = match ? match[1] : "tracks";

  const styles = useStyles();

  const handleChange = (event: ChangeEvent<unknown>, newValue: string) => {
    return router.push(`/library/${newValue}`);
  };

  return <IndexLayout>
    <Paper className={styles.paper}>
      <AppBar position="static" color="default">
        <Tabs value={tabBarValue} onChange={handleChange}
              aria-label="Library sections" textColor="primary" indicatorColor="primary"
              variant="scrollable">
          <Tab label="Tracks" value="tracks" />
          <Tab label="Albums" value="albums" />
          <Tab label="Artists" value="artists" />
          <Tab label="Playlists" value="playlists" />
        </Tabs>
      </AppBar>
      <div className={styles.content}>{children}</div>
    </Paper>
  </IndexLayout>;
}

export const getLayout = (page: ReactNode) => <LibraryLayout>{page}</LibraryLayout>;