import { AuthContext } from "lyricova-common/components/AuthContext";
import { Button, Box, Typography, Popover, Link } from "@mui/material";
import { useRouter } from "next/router";
import { LS_JWT_KEY } from "lyricova-common/frontendUtils/localStorage";
import { makeValidate, TextField } from "mui-rff";
import * as yup from "yup";
import { Form } from "react-final-form";
import { useState } from "react";
import { useApolloClient, ApolloProvider } from "@apollo/client";
import apolloClient from "lyricova-common/frontendUtils/apollo";

function Login() {
  const router = useRouter();
  const apolloClient = useApolloClient();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  return (
    <AuthContext authRedirect="/dashboard">
      <Box
        sx={{
          display: "flex",
          height: "100vh",
          flexDirection: { sm: "row", xs: "column" },
        }}
      >
        <Box sx={{ width: { sm: "min(50rem, 35%)" }, padding: 4 }}>
          <img
            src="/images/logo.svg"
            alt="Project Lyricova"
            style={{ height: "8em" }}
          />
          <h1>Log in</h1>
          <Form
            initialValues={{ username: "", password: "" }}
            validate={makeValidate(
              yup.object({
                username: yup.string().required("Username is required."),
                password: yup.string().required("Password is required."),
              })
            )}
            onSubmit={async (values) => {
              const resp = await fetch("/api/login/local/jwt", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(values),
              });
              if (resp.status === 401) {
                return { username: "Username and password is not matching." };
              } else if (resp.status !== 200) {
                return {
                  username: `Unknown error occurred (${resp.status} ${resp.statusText})`,
                };
              } else {
                const token: string = (await resp.json()).token;
                window.localStorage.setItem(LS_JWT_KEY, token);
                await apolloClient.resetStore();
                await router.push("/dashboard");
              }
            }}
          >
            {({ submitting, handleSubmit }) => (
              <form onSubmit={handleSubmit}>
                <TextField
                  sx={{ marginTop: 2 }}
                  variant="outlined"
                  required
                  fullWidth
                  helperText=" "
                  spellCheck={false}
                  name="username"
                  type="text"
                  label="Username"
                />
                <TextField
                  sx={{ marginTop: 2 }}
                  variant="outlined"
                  required
                  fullWidth
                  helperText=" "
                  spellCheck={false}
                  name="password"
                  type="password"
                  label="Password"
                />
                <div>
                  <Link
                    href="#"
                    onClick={(event) => setAnchorEl(event.currentTarget)}
                  >
                    Forgot password?
                  </Link>
                </div>
                <Button
                  sx={{ marginTop: 2 }}
                  variant="contained"
                  color="primary"
                  type="submit"
                  disabled={submitting}
                >
                  Log in
                </Button>
              </form>
            )}
          </Form>
        </Box>
        <Box
          sx={{
            flexGrow: 1,
            backgroundImage: "url(images/pattern.svg)",
            backgroundSize: { sm: "10em", xs: "7.5em" },
            backgroundPosition: { sm: "left center", xs: "center top" },
          }}
        />
      </Box>

      <Popover
        open={!!anchorEl}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
      >
        <Typography sx={{ p: 2 }}>Try harder.</Typography>
      </Popover>
    </AuthContext>
  );
}

export default function LoginWithApollo() {
  return (
    <ApolloProvider client={apolloClient}>
      <Login />
    </ApolloProvider>
  );
}
