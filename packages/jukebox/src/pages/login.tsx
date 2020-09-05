import Link from "../components/Link";
import { AuthContext } from "../components/public/AuthContext";
import { makeStyles } from "@material-ui/core";

const useStyle = makeStyles((theme) => ({
  container: {
    display: "flex",
    height: "100vh",
    [theme.breakpoints.up("sm")]: {
      flexDirection: "row",
    },
    [theme.breakpoints.down("xs")]: {
      flexDirection: "column",
    },
  },
  form: {
    [theme.breakpoints.up("sm")]: {
      width: "min(50rem, 35%)",
    },
    padding: theme.spacing(3),
  },
  pattern: {
    flexGrow: 1,
    backgroundImage: "url(images/pattern.svg)",
    [theme.breakpoints.up("sm")]: {
      backgroundSize: "10em",
      backgroundPosition: "left center",
    },
    [theme.breakpoints.down("xs")]: {
      backgroundSize: "7.5em",
      backgroundPosition: "center top",
    },
  },
}));
export default function Login() {
  const styles = useStyle();

  return <AuthContext authRedirect="/dashboard">
    <div className={styles.container}>
      <div className={styles.form}>Form</div>
      <div className={styles.pattern}></div>
    </div>
  </AuthContext>;
}
