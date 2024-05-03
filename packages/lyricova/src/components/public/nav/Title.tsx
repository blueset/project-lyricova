import { siteName, tagLine1, tagLine2 } from "../../../utils/consts";
import classes from "./Title.module.scss";

const args = new URLSearchParams(
  typeof window === "object" ? window?.location?.search ?? "" : ""
);
const useYuuruka =
  args.get("yuuruka") === "true" ||
  args.get("yuuruka") === "1" ||
  args.get("uwu") === "true" ||
  args.get("uwu") === "1" ||
  args.get("kawaii") === "true" ||
  args.get("kawaii") === "1";

export function Title() {
  return useYuuruka ? (
    <>
      <div className={classes.yuurukaTitle}>
        <img
          src="/images/yuuruka.svg"
          alt="Project Lyricova"
        />
        <div className={classes.subtitle}>
          <strong>{tagLine1}</strong> <span>{tagLine2}</span>
        </div>
      </div>
    </>
  ) : (
    <>
      <h1 className={classes.title}>{siteName}</h1>
      <div className={classes.subtitle}>
        <strong>{tagLine1}</strong> <span>{tagLine2}</span>
      </div>
    </>
  );
}
