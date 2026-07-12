"use client";
import { useRouter } from "next/navigation";
import { authClient } from "@lyricova/components";
import { useApolloClient } from "@apollo/client/react";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@lyricova/components/components/ui/button";
import { ProgressButton } from "@lyricova/components/components/ui/progress-button";
import { Card, CardContent } from "@lyricova/components/components/ui/card";
import { Input } from "@lyricova/components/components/ui/input";
import { Label } from "@lyricova/components/components/ui/label";
import { Fingerprint } from "lucide-react";
import { Toaster } from "@lyricova/components/components/ui/sonner";
import { toast } from "sonner";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required."),
  password: z.string().min(1, "Password is required."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const loginDestination = () => {
  const destination = new URLSearchParams(window.location.search).get(
    "redirect",
  );
  return destination?.startsWith("/") && !destination.startsWith("//")
    ? destination
    : "/dashboard";
};

export default function Login() {
  const router = useRouter();
  const apolloClient = useApolloClient();
  const [webAuthnSupported, setWebAuthnSupported] = useState(true);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  useEffect(() => {
    if (typeof window !== "undefined" && !window.PublicKeyCredential) {
      setWebAuthnSupported(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const publicKeyCredential = window.PublicKeyCredential;
    if (!publicKeyCredential) return;

    const conditionalAvailable =
      publicKeyCredential.isConditionalMediationAvailable;
    if (!conditionalAvailable) return;

    void (async () => {
      if (!(await conditionalAvailable.call(publicKeyCredential))) return;
      const result = await authClient.signIn.passkey({ autoFill: true });
      if (!active || result.error) return;
      await apolloClient.resetStore();
      router.push(loginDestination());
    })();

    return () => {
      active = false;
    };
  }, [apolloClient, router]);

  const webauthnLogin = useCallback(async () => {
    try {
      const result = await authClient.signIn.passkey();
      if (result.error) {
        throw new Error(result.error.message ?? "Passkey authentication failed.");
      }
      await apolloClient.resetStore();
      router.push(loginDestination());
      toast.success("Login Successful. Welcome back!");
    } catch (error) {
      console.error("Passkey login failed:", error);
      toast.error(
        `Passkey Login Failed: ${error instanceof Error ? error.message : "An unknown error occurred."}`,
      );
    }
  }, [apolloClient, router]);

  const onSubmit = async (values: LoginFormValues) => {
    try {
      const result = await authClient.signIn.username({
        username: values.username,
        password: values.password,
      });

      if (result.error) {
        setError("username", {
          type: "manual",
          message: " ",
        });
        setError("password", {
          type: "manual",
          message: "Username and password do not match.",
        });
        toast.error("Login Failed: Invalid credentials.");
        return;
      }

      await apolloClient.resetStore();
      router.push(loginDestination());
      toast.success("Login Successful. Welcome back!");
    } catch (error) {
      console.error("Login error:", error);
      setError("username", {
        type: "manual",
        message: "An unexpected error occurred during login.",
      });
      toast.error(
        `Login Error: ${error instanceof Error ? error.message : "An unexpected error occurred."}`,
      );
    }
  };

  const handleForgotPassword = (evt: React.MouseEvent<HTMLButtonElement>) => {
    evt.preventDefault();
    toast.info("Ask an administrator to reset the account with lyricova-admin.");
  };

  return (
    <>
      <Toaster
        closeButton
        richColors
        position="bottom-left"
        visibleToasts={4}
      />
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="flex w-full max-w-4xl flex-col gap-6">
          <Card className="overflow-hidden shadow-lg p-0">
            <CardContent className="grid p-0 md:grid-cols-2">
              <div className="flex flex-col justify-center p-6 md:p-8">
                <img
                  src="/images/logo.svg"
                  alt="Project Jukebox"
                  className="mb-6 h-24 self-start"
                />
                <form
                  onSubmit={handleSubmit(onSubmit)}
                  className="flex flex-col gap-4"
                >
                  <h1 className="text-2xl font-semibold tracking-tight">
                    Login
                  </h1>
                  <div className="grid gap-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      type="text"
                      autoComplete="username webauthn"
                      required
                      {...register("username")}
                      aria-invalid={errors.username ? "true" : "false"}
                    />
                    {errors.username &&
                      errors.username.message !== " " && ( // Don't show the space message
                        <p className="text-sm text-destructive-foregound-foreground">
                          {" "}
                          {errors.username.message}
                        </p>
                      )}
                  </div>
                  <div className="grid gap-2">
                    <div className="flex items-center">
                      <Label htmlFor="password">Password</Label>
                      <Button
                        type="button"
                        onClick={handleForgotPassword}
                        variant="link"
                        className="ml-auto inline-block text-sm p-0 h-auto"
                      >
                        Forgot your password?
                      </Button>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      autoComplete="current-password webauthn"
                      required
                      {...register("password")}
                      aria-invalid={errors.password ? "true" : "false"}
                    />
                    {errors.password &&
                      errors.password.message !== " " && ( // Don't show the space message
                        <p className="text-sm text-destructive-foregound-foreground">
                          {" "}
                          {/* Use text-destructive-foregound */}
                          {errors.password.message}
                        </p>
                      )}
                  </div>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                    <ProgressButton
                      type="submit"
                      className="w-full sm:flex-1"
                      progress={isSubmitting}
                    >
                      {isSubmitting ? "Logging in..." : "Login"}
                    </ProgressButton>
                    {webAuthnSupported && (
                      <ProgressButton
                        variant="outline"
                        type="button"
                        className="w-full sm:flex-1 flex items-center gap-2"
                        onClick={webauthnLogin}
                        progress={isSubmitting}
                      >
                        <Fingerprint /> Passkey
                      </ProgressButton>
                    )}
                  </div>
                </form>
              </div>
              <div className="relative hidden md:block">
                <div
                  className="absolute inset-0 bg-repeat opacity-10 dark:opacity-95"
                  style={{
                    backgroundSize: "7em",
                    backgroundImage: "url('/images/pattern.svg')",
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
