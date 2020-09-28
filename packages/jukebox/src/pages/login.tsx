import Link from "../components/Link";
import { AuthContext } from "../components/public/AuthContext";
import { makeStyles, Button } from "@material-ui/core";
import { useRouter } from "next/router";
import { LS_JWT_KEY } from "../frontendUtils/localStorage";
import apolloClient from "../frontendUtils/apollo";
import { makeValidate, TextField } from "mui-rff";
import * as yup from "yup";
import { Form } from "react-final-form";

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
    padding: theme.spacing(4),
  },
  input: {
    marginTop: theme.spacing(2),
  },
  logo: {
    height: "8rem",
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
  const router = useRouter();

  return <AuthContext authRedirect="/dashboard">
    <div className={styles.container}>
      <div className={styles.form}>
        <img src="/images/logo.svg" alt="Project Lyricova" className={styles.logo} />
        <h1>Log in</h1>
        <Form
          initialValues={{ username: "", password: "" }}
          validate={makeValidate(yup.object({
            username: yup.string().required("Username is required."),
            password: yup.string().required("Password is required."),
          }))}
          onSubmit={async (values) => {
            const resp = await fetch("/api/login/local/jwt", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(values),
            });
            if (resp.status === 401) {
              throw new Error("Username and password is not matching.");
            } else if (resp.status !== 200) {
              throw new Error(`Unknown error occurred (${resp.status} ${resp.statusText})`);
            } else {
              const token: string = (await resp.json()).token;
              window.localStorage.setItem(LS_JWT_KEY, token);
              await apolloClient.resetStore();
              await router.push("/dashboard");
            }
          }}
        >
          {({ submitting }) => (<>
            <TextField
              className={styles.input}
              variant="outlined"
              required
              fullWidth
              helperText=" "
              spellCheck={false}
              name="username" type="text" label="Username"
            />
            <TextField
              className={styles.input}
              variant="outlined"
              required
              fullWidth
              helperText=" "
              spellCheck={false}
              name="password" type="password" label="Password"
            />
            <div><Link href="#">Forgot password?</Link></div>
            <Button
              className={styles.input}
              variant="contained"
              color="primary"
              type="submit"
              disabled={submitting}
            >
              Log in
            </Button>
          </>)}
        </Form>
      </div>
      <div className={styles.pattern}/>
    </div>
  </AuthContext>;
}
