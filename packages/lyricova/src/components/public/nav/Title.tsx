import { siteName, tagLine1, tagLine2 } from "../../../utils/consts";
import classes from "./Title.module.scss";

export function Title() {
  return (
    <>
      <h1 className={classes.title}>{siteName}</h1>
      <h1 className={classes.subtitle}>
        <strong>{tagLine1}</strong> <span>{tagLine2}</span>
      </h1>
    </>
  );
}
