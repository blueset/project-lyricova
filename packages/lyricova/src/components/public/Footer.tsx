import classes from "./Footer.module.scss";

export function Footer() {
  return (
    <footer className={`container ${classes.footer}`}>
      <a href="https://1A23.com" className={classes.label}>
        1A23 Studio
      </a>
      <a href="https://1A23.com" className={classes.logo}>
        <img src="/images/logogram.svg" alt="1A23 Studio" />
      </a>
      <div className={classes.mobileText}>
        <a href="https://1A23.com" className={classes.label}>
          1A23 Studio
        </a>
        <span className={classes.label}>2013 – {new Date().getFullYear()}</span>
      </div>
      <span className={classes.label}>2013 – {new Date().getFullYear()}</span>
    </footer>
  );
}
