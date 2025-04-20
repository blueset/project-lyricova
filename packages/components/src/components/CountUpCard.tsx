import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@lyricova/components/components/ui/card";
import { cn } from "@lyricova/components/utils";
import { format, intervalToDuration } from "date-fns";
import React from "react";

interface CountUpCardProps {
  title: string;
  now: Date;
  time?: number;
  className?: string;
}

const COUNT_UP_LEVELS: ("years" | "months" | "days")[] = [
  "years",
  "months",
  "days",
];

export function CountUpCard({ title, now, time, className }: CountUpCardProps) {
  let countUpValue = <>...</>;
  if (time) {
    const dur = intervalToDuration({ start: time, end: now });
    let highestLevel = 2;
    if (dur.years ?? 0 > 0) {
      highestLevel = 0;
    } else if (dur.months ?? 0 > 0) {
      highestLevel = 1;
    }

    countUpValue = (
      <>
        {highestLevel <= 0 && (
          <>
            {dur.years ?? 0}
            <small>Y</small>
          </>
        )}
        {highestLevel <= 1 && (
          <>
            {dur.months ?? 0}
            <small>M</small>
          </>
        )}
        {highestLevel <= 2 && (
          <>
            {dur.days ?? 0}
            <small>D</small>{" "}
          </>
        )}
        <small>
          {String(dur.hours ?? 0).padStart(2, "0")}:
          {String(dur.minutes ?? 0).padStart(2, "0")}:
          {String(dur.seconds ?? 0).padStart(2, "0")}
        </small>
      </>
    );
  }
  return (
    <Card className={cn("@container/card", className)}>
      <CardHeader className="relative">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="@[250px]/card:text-4xl text-2xl font-semibold tabular-nums">
          {countUpValue}
        </CardTitle>
      </CardHeader>
      <CardFooter>
        <CardDescription className="mt-1">
          since {time ? format(new Date(time), "PP") : "..."}
        </CardDescription>
      </CardFooter>
    </Card>
  );
}
