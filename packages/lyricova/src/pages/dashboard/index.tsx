import { getLayout } from "../../components/dashboard/layouts/DashboardLayout";
import { gql, useQuery } from "@apollo/client";
import { Grid2 as Grid, Box } from "@mui/material";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { CountCard } from "lyricova-common/components/CountCard";
import { CountUpCard } from "lyricova-common/components/CountUpCard";
import type { DashboardStats } from "@lyricova/api/graphql/types";

const DASHBOARD_STATS_QUERY = gql`
  query {
    dashboardStats {
      aliveStartedOn
      revampStartedOn
      entriesCount
      pulsesCount
      tagsCount
    }
  }
`;

type ConvertedDashboardStats = Record<keyof DashboardStats, number>;

export default function DashboardIndex() {
  const [now, setNow] = useState(dayjs());
  const { data } = useQuery<{ dashboardStats: ConvertedDashboardStats }>(
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
      <Grid container spacing={2} sx={{ marginBottom: 2 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <CountUpCard
            title="Revamp dev time"
            now={now}
            time={data?.dashboardStats.revampStartedOn}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <CountUpCard
            title="Project uptime"
            now={now}
            time={data?.dashboardStats.aliveStartedOn}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4 }}>
          <CountCard
            title="# of entries"
            value={data?.dashboardStats.entriesCount}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4 }}>
          <CountCard
            title="# of pulses"
            value={data?.dashboardStats.pulsesCount}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4 }}>
          <CountCard title="# of tags" value={data?.dashboardStats.tagsCount} />
        </Grid>
      </Grid>
    </Box>
  );
}

DashboardIndex.layout = getLayout();
