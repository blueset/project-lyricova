import {getLayout} from "../../components/dashboard/layouts/DashboardLayout";
import {gql, useQuery} from "@apollo/client";
import {Grid, makeStyles, CardContent, Card, Typography, CircularProgress, Box, Button} from "@material-ui/core";
import {DashboardStats} from "../../graphql/StatsResolver";
import {useNamedState} from "../../frontendUtils/hooks";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import localizedFormat from "dayjs/plugin/localizedFormat";
import {useEffect} from "react";
import RateReviewIcon from "@material-ui/icons/RateReview";
import GetAppIcon from "@material-ui/icons/GetApp";
import CachedIcon from "@material-ui/icons/Cached";
import {NextComposedLink} from "../../components/Link";

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
`;

type ConvertedDashboardStats = Record<keyof DashboardStats, number>;

const useStyles = makeStyles((theme) => ({
  container: {
    padding: theme.spacing(2),
  },
  countUpCard: {
    "& small": {
      fontSize: "0.65em",
    },
  },
  percentageCard: {
    "& small": {
      fontSize: "0.65em",
    },
    "& .rotator": {
      float: "right",
      "& .background": {
        color: theme.palette.grey[700],
      },
      "& .foreground": {
        strokeLinecap: "round",
        position: "absolute",
      },
      "& .percentageText": {
        fontSize: "1.75em",
      },
    },
  },
  gridContainer: {
    marginBottom: theme.spacing(2),
  },
  actionButton: {
    fontSize: "1.5em",
    "& .MuiButton-iconSizeLarge > *:first-child": {
      fontSize: "2em",
    }
  },
}));

interface CountUpCardProps {
  title: string;
  now: dayjs.Dayjs;
  time?: number;
  className?: string;
}

const COUNT_UP_LEVELS: ("years" | "months" | "days")[] = ["years", "months", "days"];
dayjs.extend(duration);
dayjs.extend(localizedFormat);

function CountUpCard({title, now, time, className}: CountUpCardProps) {

  let countUpValue = <>...</>;
  if (time) {
    const duration = dayjs.duration(now.diff(time));

    let highestLevel = 0;
    while (highestLevel + 1 < COUNT_UP_LEVELS.length && duration.as(COUNT_UP_LEVELS[highestLevel]) < 1) {
      highestLevel++;
    }

    countUpValue = <>
      {highestLevel <= 0 && <>{duration.years()}<small>Y</small></>}
      {highestLevel <= 1 && <>{duration.months()}<small>M</small></>}
      {highestLevel <= 2 && <>{duration.days()}<small>D</small>{" "}</>}
      <small>{duration.hours().toString().padStart(2, "0")}:{duration.minutes().toString().padStart(2, "0")}:{duration.seconds().toString().padStart(2, "0")}</small>
    </>;
  }
  return <Card className={className}>
    <CardContent>
      <Typography color="textSecondary" gutterBottom>{title}</Typography>
      <Typography variant="h3">{countUpValue}</Typography>
      <Typography color="textSecondary">since {time ? dayjs(time).format("LL") : "..."}</Typography>
    </CardContent>
  </Card>;
}

interface CountCardProps {
  title: string;
  value?: number;
  className?: string;
}

function CountCard({title, value, className}: CountCardProps) {
  return <Card className={className}>
    <CardContent>
      <Typography color="textSecondary" gutterBottom>{title}</Typography>
      <Typography variant="h3">{value === null ? "..." : value}</Typography>
    </CardContent>
  </Card>;
}

interface PercentageCardProps {
  title: string;
  value?: number;
  total?: number;
  className?: string;
}

function PercentageCard({title, value, total, className}: PercentageCardProps) {
  let rotator = <></>;
  let valueText = <>...</>;
  if (value !== null && total !== null) {
    const percentage = total === 0 ? 0 : (value / total) * 100;
    valueText = <>{value}<small>/{total}</small></>;
    rotator = (
      <Box position="relative" display="inline-flex" className="rotator">
        <CircularProgress variant="static" size="6em" value={100} thickness={5} className="background"/>
        <CircularProgress variant="static" size="6em" value={percentage} thickness={5} className="foreground"/>
        <Box
          top={0}
          left={0}
          bottom={0}
          right={0}
          position="absolute"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Typography variant="body1" component="div" color="textPrimary"
                      className="percentageText">{`${Math.round(percentage)}`}<small>%</small></Typography>
        </Box>
      </Box>
    );
  }
  return <Card className={className}>
    <CardContent>
      {rotator}
      <Typography color="textSecondary" gutterBottom>{title}</Typography>
      <Typography variant="h3">{valueText}</Typography>
    </CardContent>
  </Card>;
}

export default function DashboardIndex() {
  const [now, setNow] = useNamedState(dayjs(), "now");
  const {error, data} = useQuery<{ dashboardStats: ConvertedDashboardStats }>(DASHBOARD_STATS_QUERY);

  const styles = useStyles();

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(dayjs());
    }, 1000);
    return () => {
      clearInterval(timer);
    };
  }, [setNow]);

  return <div className={styles.container}>
    {error && `Error occured while loading stats: ${error}`}
    <Grid container spacing={2} className={styles.gridContainer}>
      <Grid item xs={12} md={6}>
        <CountUpCard title="Revamp dev time" now={now} time={data?.dashboardStats.revampStartedOn}
                     className={styles.countUpCard}/>
      </Grid>
      <Grid item xs={12} md={6}>
        <CountUpCard title="Project uptime" now={now} time={data?.dashboardStats.aliveStartedOn}
                     className={styles.countUpCard}/>
      </Grid>
      <Grid item xs={6} sm={3}>
        <CountCard title="# of Music files" value={data?.dashboardStats.musicFilesCount}/>
      </Grid>
      <Grid item xs={6} sm={3}>
        <CountCard title="# of Music entities" value={data?.dashboardStats.songCount}/>
      </Grid>
      <Grid item xs={6} sm={3}>
        <CountCard title="# of Artist entities" value={data?.dashboardStats.artistCount}/>
      </Grid>
      <Grid item xs={6} sm={3}>
        <CountCard title="# of Album entities" value={data?.dashboardStats.albumCount}/>
      </Grid>
      <Grid item xs={12} sm={4}>
        <PercentageCard title="Reviewed files" value={data?.dashboardStats.reviewedFilesCount}
                        total={data?.dashboardStats.musicFilesCount} className={styles.percentageCard}/>
      </Grid>
      <Grid item xs={12} sm={4}>
        <PercentageCard title="Files with lyrics" value={data?.dashboardStats.filesHasLyricsCount}
                        total={data?.dashboardStats.musicFilesCount} className={styles.percentageCard}/>
      </Grid>
      <Grid item xs={12} sm={4}>
        <PercentageCard title="Files with cover" value={data?.dashboardStats.filesHasCoverCount}
                        total={data?.dashboardStats.musicFilesCount} className={styles.percentageCard}/>
      </Grid>
    </Grid>
    <Typography variant="h4" component="h2">Actions</Typography>
    <Grid container spacing={2} className={styles.gridContainer}>
      <Grid item xs={4}>
        <Button
          fullWidth size="large" variant="outlined" className={styles.actionButton}
          color="secondary"
          component={NextComposedLink} href="/dashboard/review"
          startIcon={<RateReviewIcon/>}
        >
          Review
        </Button>
      </Grid>
      <Grid item xs={4}>
        <Button
          fullWidth size="large" variant="outlined" className={styles.actionButton}
          color="default"
          component={NextComposedLink} href="/dashboard/download"
          startIcon={<GetAppIcon/>}
        >
          Download
        </Button>
      </Grid>
      <Grid item xs={4}>
        <Button
          fullWidth size="large" variant="outlined" className={styles.actionButton}
          color="default"
          component={NextComposedLink} href="/dashboard/scan"
          startIcon={<CachedIcon/>}
        >
          Scan
        </Button>
      </Grid>
    </Grid>
  </div>;
}

DashboardIndex.layout = getLayout();