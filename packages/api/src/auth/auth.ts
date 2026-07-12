import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { admin, username } from "better-auth/plugins";
import { passkey } from "@better-auth/passkey";
import { db, fullSchema } from "../drizzle/client.js";
import { authConfig } from "./config.js";
import { hashPassword, verifyPassword } from "./password.js";
import logger from "../utils/logger.js";

const DAY = 60 * 60 * 24;
const AUDITED_PATHS = new Set([
  "/sign-in/username",
  "/sign-in/passkey",
  "/sign-out",
  "/passkey/verify-registration",
  "/passkey/update-passkey",
  "/passkey/delete-passkey",
  "/revoke-session",
  "/revoke-sessions",
]);

export const auth = betterAuth({
  appName: "Project Lyricova",
  secret: authConfig.secret,
  ...(authConfig.secrets ? { secrets: authConfig.secrets } : {}),
  baseURL: {
    allowedHosts: [...authConfig.allowedHosts],
    protocol: authConfig.production ? "https" : "auto",
  },
  basePath: "/api/auth",
  trustedOrigins: [...authConfig.trustedOrigins],
  database: drizzleAdapter(db, {
    provider: "mysql",
    schema: fullSchema,
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    password: {
      hash: hashPassword,
      verify: verifyPassword,
    },
  },
  rateLimit: {
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/username": {
        window: 60,
        max: 5,
      },
      "/sign-in/passkey": {
        window: 60,
        max: 10,
      },
    },
  },
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      if (!AUDITED_PATHS.has(ctx.path)) return;
      logger.info("Authentication event", {
        event: ctx.path,
        userId: ctx.context.newSession?.user.id,
        ipAddress: ctx.request?.headers.get("x-forwarded-for"),
        userAgent: ctx.request?.headers.get("user-agent"),
      });
    }),
  },
  user: {
    modelName: "Users",
    fields: {
      name: "displayName",
      createdAt: "creationDate",
      updatedAt: "updatedOn",
    },
  },
  account: {
    modelName: "AuthAccounts",
    fields: {
      createdAt: "creationDate",
      updatedAt: "updatedOn",
    },
  },
  session: {
    modelName: "AuthSessions",
    fields: {
      createdAt: "creationDate",
      updatedAt: "updatedOn",
    },
    expiresIn: 7 * DAY,
    updateAge: DAY,
    freshAge: 10 * 60,
  },
  verification: {
    modelName: "AuthVerifications",
    fields: {
      createdAt: "creationDate",
      updatedAt: "updatedOn",
    },
  },
  advanced: {
    cookiePrefix: "lyricova",
    useSecureCookies: authConfig.production,
    database: {
      generateId: ({ model }) =>
        model === "user" || model === "Users"
          ? false
          : crypto.randomUUID(),
    },
    ...(authConfig.cookieDomain
      ? {
        crossSubDomainCookies: {
          enabled: true,
          domain: authConfig.cookieDomain,
        },
      }
      : {}),
  },
  disabledPaths: [
    "/is-username-available",
    "/request-password-reset",
    "/reset-password",
    "/change-password",
    "/change-email",
    "/delete-user",
    "/admin/ban-user",
    "/admin/create-user",
    "/admin/get-user",
    "/admin/has-permission",
    "/admin/impersonate-user",
    "/admin/list-users",
    "/admin/list-user-sessions",
    "/admin/remove-user",
    "/admin/revoke-user-session",
    "/admin/revoke-user-sessions",
    "/admin/set-role",
    "/admin/set-user-password",
    "/admin/stop-impersonating",
    "/admin/unban-user",
    "/admin/update-user",
  ],
  plugins: [
    username({
      minUsernameLength: 1,
      maxUsernameLength: 256,
      usernameValidator: (value) => value.trim().length === value.length,
      schema: {
        user: {
          fields: {
            username: "username",
            displayUsername: "displayUsername",
          },
        },
      },
    }),
    admin({
      defaultRole: "guest",
      adminRoles: ["admin"],
    }),
    passkey({
      rpID: authConfig.webAuthnRpId,
      rpName: "Project Lyricova",
      origin: [...authConfig.webAuthnOrigins],
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "required",
      },
      registration: {
        afterVerification: ({ verification }) => {
          if (!verification.registrationInfo?.userVerified) {
            throw new APIError("BAD_REQUEST", {
              message: "Passkey registration requires user verification.",
            });
          }
        },
      },
      authentication: {
        afterVerification: ({ verification }) => {
          if (!verification.authenticationInfo.userVerified) {
            throw new APIError("UNAUTHORIZED", {
              message: "Passkey authentication requires user verification.",
            });
          }
        },
      },
      schema: {
        passkey: {
          modelName: "UserPasskeys",
          fields: {
            createdAt: "creationDate",
          },
        },
      },
    }),
  ],
});

export type AuthSession = typeof auth.$Infer.Session;
