import { getLayout } from "../../components/dashboard/layouts/DashboardLayout";
import { gql, useQuery } from "@apollo/client";
import { Grid, Typography, Box, Button } from "@mui/material";
import type { DashboardStats } from "../../graphql/StatsResolver";
import { useNamedState } from "../../frontendUtils/hooks";
import dayjs from "dayjs";
import { useEffect } from "react";
import RateReviewIcon from "@mui/icons-material/RateReview";
import GetAppIcon from "@mui/icons-material/GetApp";
import CachedIcon from "@mui/icons-material/Cached";
import { NextComposedLink } from "lyricova-common/components/Link";
import type { DocumentNode } from "graphql";
import { CountCard } from "lyricova-common/components/CountCard";
import { CountUpCard } from "lyricova-common/components/CountUpCard";
import { PercentageCard } from "lyricova-common/components/PercentageCard";

const DASHBOARD_STATS_QUERY = gql`
  query {
    dashboardStats {
      aliveStartedOn
      revampStartedOn
      musicFilesCount
      reviewedFilesCount
      filesHasLyricsCount
      filesHasCoverCount
      songCount
      artistCount
      albumCount
    }
  }
` as DocumentNode;

type ConvertedDashboardStats = Record<keyof DashboardStats, number>;

const ActionButtonSx = {
  fontSize: "1.5em",
  "& .MuiButton-iconSizeLarge > *:first-child": {
    fontSize: "2em",
  },
};

export default function DashboardIndex() {
  const [now, setNow] = useNamedState(dayjs(), "now");
  const { error, data } = useQuery<{ dashboardStats: ConvertedDashboardStats }>(
    DASHBOARD_STATS_QUERY
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(dayjs());
    }, 1000);
    return () => {
      clearInterval(timer);
    };
  }, [setNow]);

  return (
    <Box sx={{ padding: 2 }}>
      {error && `Error occurred while loading stats: ${error}`}
      <Grid container spacing={2} sx={{ marginBottom: 2 }}>
        <Grid item xs={12} md={6}>
          <CountUpCard
            title="Revamp dev time"
            now={now}
            time={data?.dashboardStats.revampStartedOn}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <CountUpCard
            title="Project uptime"
            now={now}
            time={data?.dashboardStats.aliveStartedOn}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <CountCard
            title="# of Music files"
            value={data?.dashboardStats.musicFilesCount}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <CountCard
            title="# of Music entities"
            value={data?.dashboardStats.songCount}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <CountCard
            title="# of Artist entities"
            value={data?.dashboardStats.artistCount}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <CountCard
            title="# of Album entities"
            value={data?.dashboardStats.albumCount}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <PercentageCard
            title="Reviewed files"
            value={data?.dashboardStats.reviewedFilesCount}
            total={data?.dashboardStats.musicFilesCount}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <PercentageCard
            title="Files with lyrics"
            value={data?.dashboardStats.filesHasLyricsCount}
            total={data?.dashboardStats.musicFilesCount}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <PercentageCard
            title="Files with cover"
            value={data?.dashboardStats.filesHasCoverCount}
            total={data?.dashboardStats.musicFilesCount}
          />
        </Grid>
      </Grid>
      <Typography variant="h4" component="h2">
        Actions
      </Typography>
      <Grid container spacing={2} sx={{ marginBottom: 2 }}>
        <Grid item xs={4}>
          <Button
            fullWidth
            size="large"
            variant="outlined"
            sx={ActionButtonSx}
            color="secondary"
            component={NextComposedLink}
            href="/dashboard/review"
            startIcon={<RateReviewIcon />}
          >
            <Box
              sx={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}
            >
              <span>Review</span>
              <Box
                component="span"
                sx={{ fontSize: "0.7em", opacity: 0.6, textTransform: "none" }}
              >
                Review music files
              </Box>
            </Box>
          </Button>
        </Grid>
        <Grid item xs={4}>
          <Button
            fullWidth
            size="large"
            variant="outlined"
            sx={ActionButtonSx}
            component={NextComposedLink}
            href="/dashboard/download"
            startIcon={<GetAppIcon />}
          >
            <Box
              sx={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}
            >
              <span>Download</span>
              <Box
                component="span"
                sx={{ fontSize: "0.7em", opacity: 0.6, textTransform: "none" }}
              >
                Download with YT-DLP, etc.
              </Box>
            </Box>
          </Button>
        </Grid>
        <Grid item xs={4}>
          <Button
            fullWidth
            size="large"
            variant="outlined"
            sx={ActionButtonSx}
            component={NextComposedLink}
            href="/dashboard/scan"
            startIcon={<CachedIcon />}
          >
            <Box
              sx={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}
            >
              <span>Scan</span>
              <Box
                component="span"
                sx={{ fontSize: "0.7em", opacity: 0.6, textTransform: "none" }}
              >
                Rescan local music files
              </Box>
            </Box>
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
}

DashboardIndex.layout = getLayout();
