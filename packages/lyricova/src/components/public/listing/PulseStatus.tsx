import type { Entry } from "@/frontendUtils/restTypes";
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
    ...entry.pulses.map((pulse) =>
      pulse.creationDate ? new Date(pulse.creationDate).getTime() : 0,
    ),
  );
  const creationDate = entry.creationDate ? new Date(entry.creationDate) : 0;
  return (
    <div suppressHydrationWarning>
      {lastPulseTime
        ? `Last bumped ${formatTime(lastPulseTime)}, first posted ${formatTime(
            creationDate,
          )}.`
        : `First posted ${formatTime(creationDate)}.`}
    </div>
  );
}
