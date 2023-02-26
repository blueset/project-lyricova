import { Card, CardContent, Typography } from "@mui/material";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import localizedFormat from "dayjs/plugin/localizedFormat";
import React from "react";

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

export function CountUpCard({ title, now, time, className }: CountUpCardProps) {
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
