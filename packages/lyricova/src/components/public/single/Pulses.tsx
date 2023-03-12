import type { Pulse } from "lyricova-common/models/Pulse";
import { Divider } from "../Divider";
import classes from "./Pulses.module.scss";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

interface PulsesProps {
  pulses: Pulse[];
  creationDate: Date;
}

export function Pulses({ pulses, creationDate }: PulsesProps) {
  const creationObj = dayjs(creationDate);
  const pulsesObj = pulses
    .sort((a, b) => b.creationDate.valueOf() - a.creationDate.valueOf())
    .map((pulse) => dayjs(pulse.creationDate));
  if (!pulses || pulses.length === 0) {
    return (
      <>
        <div className={`container verticalPadding ${classes.pulsesIsolated}`}>
          <h2 className={classes.pulsesTitle}>Pulses</h2>
          <div className={classes.pulsesListing}>
            <div className={classes.pulseEntry}>
              First posted {creationObj.fromNow()}{" "}
              <time dateTime={creationObj.toISOString()}>
                on {creationObj.format("D MMMM YYYY [at] hh:mm")}
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
              Bumped {pulsesObj[0].fromNow()}{" "}
              <time dateTime={pulsesObj[0].toISOString()}>
                on {pulsesObj[0].format("D MMMM YYYY [at] hh:mm")}
              </time>
            </div>
            <div className={classes.pulseEntry}>
              First posted {creationObj.fromNow()}{" "}
              <time dateTime={creationObj.toISOString()}>
                on {creationObj.format("D MMMM YYYY [at] hh:mm")}
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
                Bumped {pulseObj.fromNow()}{" "}
                <time dateTime={pulseObj.toISOString()}>
                  on {pulseObj.format("D MMMM YYYY [at] hh:mm")}
                </time>
              </div>
            ))}
            <div className={classes.pulseEntry}>
              First posted {creationObj.fromNow()}{" "}
              <time dateTime={creationObj.toISOString()}>
                on {creationObj.format("D MMMM YYYY [at] hh:mm")}
              </time>
            </div>
          </div>
        </div>
      </div>
      <Divider />
    </>
  );
}
