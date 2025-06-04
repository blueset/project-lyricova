"use client";

import { useRouter } from "next/navigation";
import { AuthContext, LS_JWT_KEY } from "@lyricova/components";
import { useApolloClient } from "@apollo/client";
import { useCallback, useEffect, useState } from "react";
import base64url from "base64url";
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

  const webauthnLogin = useCallback(async () => {
    try {
      const resp = await fetch("/api/login/public-key/challenge", {
        method: "POST",
        headers: {
          Accept: "application/json",
        },
      });
      if (!resp.ok) throw new Error("Failed to get challenge");
      const json = await resp.json();
      const credential = (await navigator.credentials.get({
        publicKey: {
          challenge: base64url.toBuffer(
            json.challenge
          ) as unknown as ArrayBuffer,
          // allowCredentials: [], // You might need to specify allowed credentials if required by your RP
          // userVerification: "preferred", // Or "required" or "discouraged"
        },
      })) as PublicKeyCredential | null;

      if (!credential) {
        toast.error("Credential retrieval cancelled or failed.");
        return;
      }

      const body = {
        id: credential.id,
        response: {
          clientDataJSON: base64url.encode(
            (credential.response as AuthenticatorAssertionResponse)
              .clientDataJSON as unknown as Buffer
          ),
          authenticatorData: base64url.encode(
            (credential.response as AuthenticatorAssertionResponse)
              .authenticatorData as unknown as Buffer
          ),
          signature: base64url.encode(
            (credential.response as AuthenticatorAssertionResponse)
              .signature as unknown as Buffer
          ),
          userHandle: (credential.response as AuthenticatorAssertionResponse)
            .userHandle
            ? base64url.encode(
                (credential.response as AuthenticatorAssertionResponse)
                  .userHandle as unknown as Buffer
              )
            : null, // Use null or omit if userHandle is not present
        },
        type: credential.type,
        ...(credential.authenticatorAttachment
          ? { authenticatorAttachment: credential.authenticatorAttachment }
          : {}),
      };

      const loginReq = await fetch("/api/login/public-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!loginReq.ok) {
        const errorData = await loginReq.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Passkey login failed: ${loginReq.statusText}`
        );
      }

      const loginResp = await loginReq.json();
      const token: string = loginResp.token;
      window.localStorage.setItem(LS_JWT_KEY, token);
      await apolloClient.resetStore();
      await router.push("/dashboard");
      toast.success("Login Successful. Welcome back!");
    } catch (error: any) {
      console.error("Passkey login failed:", error);
      toast.error(
        `Passkey Login Failed: ${error.message || "An unknown error occurred."}`
      );
    }
  }, [apolloClient, router]);

  const onSubmit = async (values: LoginFormValues) => {
    try {
      const resp = await fetch("/api/login/local/jwt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (resp.status === 401) {
        setError("username", {
          type: "manual",
          message: " ", // Keep space for layout consistency if needed
        });
        setError("password", {
          type: "manual",
          message: "Username and password do not match.",
        });
        toast.error("Login Failed: Invalid credentials.");
        return;
      } else if (!resp.ok) {
        const errorText = await resp.text();
        setError("username", {
          type: "manual",
          message: `Login failed: ${resp.status} ${resp.statusText}`,
        });
        toast.error(`Login Error: ${errorText || resp.statusText}`);
        return;
      }

      const token: string = (await resp.json()).token;
      window.localStorage.setItem(LS_JWT_KEY, token);
      await apolloClient.resetStore();
      await router.push("/dashboard");
      toast.success("Login Successful. Welcome back!");
    } catch (error: any) {
      console.error("Login error:", error);
      setError("username", {
        type: "manual",
        message: "An unexpected error occurred during login.",
      });
      toast.error(
        `Login Error: ${error.message || "An unexpected error occurred."}`
      );
    }
  };

  const handleForgotPassword = (evt: React.MouseEvent<HTMLButtonElement>) => {
    evt.preventDefault();
    toast.info("Try harder.");
  };

  return (
    <AuthContext authRedirect="/dashboard">
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
                      required
                      {...register("username")}
                      aria-invalid={errors.username ? "true" : "false"}
                    />
                    {errors.username &&
                      errors.username.message !== " " && ( // Don't show the space message
                        <p className="text-sm text-destructive">
                          {" "}
                          {/* Use text-destructive */}
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
                      required
                      {...register("password")}
                      aria-invalid={errors.password ? "true" : "false"}
                    />
                    {errors.password &&
                      errors.password.message !== " " && ( // Don't show the space message
                        <p className="text-sm text-destructive">
                          {" "}
                          {/* Use text-destructive */}
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
    </AuthContext>
  );
}
