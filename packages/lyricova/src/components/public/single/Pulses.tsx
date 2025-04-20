import type { Pulse } from "@lyricova/api/graphql/types";
import { Divider } from "../Divider";
import classes from "./Pulses.module.scss";
import { formatDistanceToNow, format } from "date-fns";

interface PulsesProps {
  pulses: Pulse[];
  creationDate: Date;
}

export function Pulses({ pulses, creationDate }: PulsesProps) {
  const creationObj = new Date(creationDate);
  const pulsesObj = pulses
    .sort(
      (a, b) =>
        new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime()
    )
    .map((pulse) => new Date(pulse.creationDate));
  if (!pulses || pulses.length === 0) {
    return (
      <>
        <div className={`container verticalPadding ${classes.pulsesIsolated}`}>
          <h2 className={classes.pulsesTitle}>Pulses</h2>
          <div className={classes.pulsesListing}>
            <div className={classes.pulseEntry}>
              First posted{" "}
              {formatDistanceToNow(creationObj, { addSuffix: true })}{" "}
              <time
                dateTime={creationObj.toISOString()}
                suppressHydrationWarning
              >
                on {format(creationObj, "d MMMM yyyy 'at' hh:mm")}
              </time>
            </div>
          </div>
        </div>
        <Divider />
      </>
    );
  }
  if (pulses?.length === 1) {
    return (
      <>
        <div className={`container verticalPadding ${classes.pulsesIsolated}`}>
          <h2 className={classes.pulsesTitle}>Pulses</h2>
          <div className={classes.pulsesListing}>
            <div className={classes.pulseEntry}>
              Bumped {formatDistanceToNow(pulsesObj[0], { addSuffix: true })}{" "}
              <time
                dateTime={pulsesObj[0].toISOString()}
                suppressHydrationWarning
              >
                on {format(pulsesObj[0], "d MMMM yyyy 'at' hh:mm")}
              </time>
            </div>
            <div className={classes.pulseEntry}>
              First posted{" "}
              {formatDistanceToNow(creationObj, { addSuffix: true })}{" "}
              <time
                dateTime={creationObj.toISOString()}
                suppressHydrationWarning
              >
                on {format(creationObj, "d MMMM yyyy 'at' hh:mm")}
              </time>
            </div>
          </div>
        </div>
        <Divider />
      </>
    );
  }
  return (
    <>
      <div className={`container verticalPadding ${classes.pulsesCounter}`}>
        <div className={classes.pulsesCountContainer}>
          <h2 className={classes.pulsesTitle}>Pulses</h2>
          <div className={classes.pulsesCount}>{pulses.length}</div>
        </div>
        <div className={classes.pulsesListing}>
          <div className={classes.pulsesListingInner}>
            {pulsesObj.map((pulseObj, index) => (
              <div className={classes.pulseEntry} key={index}>
                Bumped {formatDistanceToNow(pulseObj, { addSuffix: true })}{" "}
                <time dateTime={pulseObj.toISOString()}>
                  on {format(pulseObj, "d MMMM yyyy 'at' hh:mm")}
                </time>
              </div>
            ))}
            <div className={classes.pulseEntry}>
              First posted{" "}
              {formatDistanceToNow(creationObj, { addSuffix: true })}{" "}
              <time dateTime={creationObj.toISOString()}>
                on {format(creationObj, "d MMMM yyyy 'at' hh:mm")}
              </time>
            </div>
          </div>
        </div>
      </div>
      <Divider />
    </>
  );
}
