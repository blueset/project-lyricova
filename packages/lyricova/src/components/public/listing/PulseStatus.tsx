import type { Entry } from "lyricova-common/models/Entry";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

function formatTime(date: Date | number) {
  const dateObj = dayjs(date);
  if (dateObj.diff(dayjs(), "year") >= 1) {
    return `in ${dateObj.year()}`;
  } else {
    return dateObj.fromNow();
  }
}

interface PulseStatusProps {
  entry: Entry;
}

export function PulseStatus({ entry }: PulseStatusProps) {
  const lastPulseTime = Math.max(
    0,
    ...entry.pulses.map((pulse) => pulse.creationDate.valueOf())
  );
  return (
    <div>
      {lastPulseTime
        ? `Last bumped ${formatTime(lastPulseTime)}, first posted ${formatTime(
            entry.creationDate
          )}.`
        : `First posted ${formatTime(entry.creationDate)}.`}
    </div>
  );
}
