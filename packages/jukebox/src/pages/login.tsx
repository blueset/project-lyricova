import Link from "../components/Link";
import { AuthContext } from "../components/public/AuthContext";
import { makeStyles, Button } from "@material-ui/core";
import { Formik, Field, Form } from "formik";
import { TextField } from "formik-material-ui";
import { useRouter } from "next/router";
import { LS_JWT_KEY } from "../frontendUtils/localStorage";



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
        <Formik
          initialValues={{ username: "", password: "" }}
          validate={values => {
            const errors: { username?: string, password?: string } = {};
            if (!values.username) errors.username = "Required";
            if (!values.password) errors.password = "Required";
            return errors;
          }}
          onSubmit={async (values, { setSubmitting, setErrors }) => {
            const resp = await fetch("/api/login/local/jwt", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(values),
            });
            if (resp.status === 401) {
              const errorMsg = "Username and password is not matching.";
              setErrors({ username: errorMsg, password: errorMsg });
            } else if (resp.status !== 200) {
              const errorMsg = `Unknown error occurred (${resp.status} ${resp.statusText})`;
              setErrors({ username: errorMsg, password: errorMsg });
            } else {
              const token: string = (await resp.json()).token;
              window.localStorage.setItem(LS_JWT_KEY, token);
              router.push("/dashboard");
            }
            setSubmitting(false);
          }}
        >
          {({ isSubmitting }) => (<Form>
            <Field
              component={TextField}
              className={styles.input}
              variant="outlined"
              required
              fullWidth
              helperText=" "
              spellCheck={false}
              name="username" type="text" label="Username"
            />
            <Field
              component={TextField}
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
              disabled={isSubmitting}
            >
              Log in
            </Button>
          </Form>)}
        </Formik>
      </div>
      <div className={styles.pattern}></div>
    </div>
  </AuthContext>;
}
