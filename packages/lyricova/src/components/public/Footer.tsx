import classes from "./Footer.module.scss";

export function Footer() {
  return (
    <footer className={`container ${classes.footer}`}>
      <a href="https://1A23.com">1A23 Studio</a>
      <a href="https://1A23.com">
        <img src="/images/logogram.svg" alt="1A23 Studio" />
      </a>
      <span>2013 – {new Date().getFullYear()}</span>
    </footer>
  );
}
