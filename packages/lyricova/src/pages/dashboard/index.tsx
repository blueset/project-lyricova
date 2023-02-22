import { getLayout } from "../../components/dashboard/layouts/DashboardLayout";
import {
  Grid,
  CardContent,
  Card,
  Typography,
  CircularProgress,
  Box,
  Button,
} from "@mui/material";
// import { DashboardStats } from "../../graphql/StatsResolver";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import localizedFormat from "dayjs/plugin/localizedFormat";
import { useEffect, useState } from "react";
import RateReviewIcon from "@mui/icons-material/RateReview";
import GetAppIcon from "@mui/icons-material/GetApp";
import CachedIcon from "@mui/icons-material/Cached";
import { NextComposedLink } from "lyricova-common/components/Link";

const ActionButtonSx = {
  fontSize: "1.5em",
  "& .MuiButton-iconSizeLarge > *:first-child": {
    fontSize: "2em",
  },
};

interface CountUpCardProps {
  title: string;
  now: dayjs.Dayjs;
  time?: number;
  className?: string;
}

const COUNT_UP_LEVELS: ("years" | "months" | "days")[] = [
  "years",
  "months",
  "days",
];
dayjs.extend(duration);
dayjs.extend(localizedFormat);

function CountUpCard({ title, now, time, className }: CountUpCardProps) {
  let countUpValue = <>...</>;
  if (time) {
    const duration = dayjs.duration(now.diff(time));

    let highestLevel = 0;
    while (
      highestLevel + 1 < COUNT_UP_LEVELS.length &&
      duration.as(COUNT_UP_LEVELS[highestLevel]) < 1
    ) {
      highestLevel++;
    }

    countUpValue = (
      <>
        {highestLevel <= 0 && (
          <>
            {duration.years()}
            <small style={{ fontSize: "0.65em" }}>Y</small>
          </>
        )}
        {highestLevel <= 1 && (
          <>
            {duration.months()}
            <small style={{ fontSize: "0.65em" }}>M</small>
          </>
        )}
        {highestLevel <= 2 && (
          <>
            {duration.days()}
            <small style={{ fontSize: "0.65em" }}>D</small>{" "}
          </>
        )}
        <small style={{ fontSize: "0.65em" }}>
          {duration
            .hours()
            .toString()
            .padStart(2, "0")}
          :
          {duration
            .minutes()
            .toString()
            .padStart(2, "0")}
          :
          {duration
            .seconds()
            .toString()
            .padStart(2, "0")}
        </small>
      </>
    );
  }
  return (
    <Card className={className}>
      <CardContent>
        <Typography color="textSecondary" gutterBottom>
          {title}
        </Typography>
        <Typography variant="h3">{countUpValue}</Typography>
        <Typography color="textSecondary">
          since {time ? dayjs(time).format("LL") : "..."}
        </Typography>
      </CardContent>
    </Card>
  );
}

interface CountCardProps {
  title: string;
  value?: number;
  className?: string;
}

function CountCard({ title, value, className }: CountCardProps) {
  return (
    <Card className={className}>
      <CardContent>
        <Typography color="textSecondary" gutterBottom>
          {title}
        </Typography>
        <Typography variant="h3">{value === null ? "..." : value}</Typography>
      </CardContent>
    </Card>
  );
}

interface PercentageCardProps {
  title: string;
  value?: number;
  total?: number;
  className?: string;
}

function PercentageCard({
  title,
  value,
  total,
  className,
}: PercentageCardProps) {
  let rotator = <></>;
  let valueText = <>...</>;
  if (value !== null && total !== null) {
    const percentage = total === 0 ? 0 : (value / total) * 100;
    valueText = (
      <>
        {value}
        <small>/{total}</small>
      </>
    );
    rotator = (
      <Box
        position="relative"
        display="inline-flex"
        className="rotator"
        sx={{ float: "right" }}
      >
        <CircularProgress
          size="6em"
          value={100}
          thickness={5}
          className="background"
          variant="determinate"
          sx={{ color: "grey.800" }}
        />
        <CircularProgress
          size="6em"
          value={percentage}
          thickness={5}
          className="foreground"
          variant="determinate"
          sx={{ strokeLinecap: "round", position: "absolute" }}
        />
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
          <Typography
            variant="body1"
            component="div"
            color="textPrimary"
            sx={{ fontSize: "1.75em" }}
            className="percentageText"
          >
            {`${Math.round(percentage)}`}
            <small style={{ fontSize: "0.65em" }}>%</small>
          </Typography>
        </Box>
      </Box>
    );
  }
  return (
    <Card className={className}>
      <CardContent>
        {rotator}
        <Typography color="textSecondary" gutterBottom>
          {title}
        </Typography>
        <Typography variant="h3">{valueText}</Typography>
      </CardContent>
    </Card>
  );
}

export default function DashboardIndex() {
  const [now, setNow] = useState(dayjs());

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
      <Grid container spacing={2} sx={{ marginBottom: 2 }}></Grid>
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
