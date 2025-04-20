import type { Entry } from "@lyricova/api/graphql/types";
import { formatDistanceToNow } from "date-fns";

function formatTime(date: Date | number) {
  const now = new Date();
  if (date instanceof Date && date.getFullYear() > now.getFullYear()) {
    return `in ${date.getFullYear()}`;
  } else {
    return formatDistanceToNow(date, { addSuffix: true });
  }
}

interface PulseStatusProps {
  entry: Entry;
}

export function PulseStatus({ entry }: PulseStatusProps) {
  const lastPulseTime = Math.max(
    0,
    ...entry.pulses.map((pulse) => new Date(pulse.creationDate).getTime())
  );
  return (
    <div suppressHydrationWarning>
      {lastPulseTime
        ? `Last bumped ${formatTime(lastPulseTime)}, first posted ${formatTime(
            new Date(entry.creationDate)
          )}.`
        : `First posted ${formatTime(new Date(entry.creationDate))}.`}
    </div>
  );
}
