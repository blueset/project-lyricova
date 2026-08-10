import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function sessionCheckDetails(request: NextRequest, sessionUrl: URL) {
  const cookie = request.headers.get("cookie") ?? "";
  return {
    sessionUrl: sessionUrl.toString(),
    requestHost: request.headers.get("host"),
    forwardedHost: request.headers.get("x-forwarded-host"),
    forwardedProto: request.headers.get("x-forwarded-proto"),
    nextUrlHost: request.nextUrl.host,
    hasCookieHeader: cookie.length > 0,
    hasSessionCookie: /(?:^|;\s*)(?:__Secure-)?lyricova\.session_token=/.test(
      cookie,
    ),
  };
}

async function hasSession(request: NextRequest): Promise<boolean> {
  const sessionUrl = new URL(
    "/api/auth/get-session",
    process.env.API_INTERNAL_URL ?? "http://localhost:8083",
  );
  const details = sessionCheckDetails(request, sessionUrl);

  try {
    const response = await fetch(sessionUrl, {
      headers: {
        cookie: request.headers.get("cookie") ?? "",
        "x-forwarded-host": request.headers.get("host") ?? request.nextUrl.host,
        "x-forwarded-proto": request.nextUrl.protocol.slice(0, -1),
      },
      cache: "no-store",
    });
    const responseText = await response.text();
    if (!response.ok) {
      console.error("Dashboard session verification returned an error", {
        ...details,
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get("content-type"),
        responseBody: responseText.slice(0, 1_000),
      });
      return false;
    }

    let body: { session?: unknown } | null;
    try {
      body = JSON.parse(responseText) as { session?: unknown } | null;
    } catch (error) {
      console.error("Dashboard session verification returned invalid JSON", {
        ...details,
        status: response.status,
        contentType: response.headers.get("content-type"),
        responseBody: responseText.slice(0, 1_000),
        error,
      });
      return false;
    }

    if (!body?.session) {
      console.warn("Dashboard session verification found no session", {
        ...details,
        status: response.status,
      });
      return false;
    }
    return true;
  } catch (error) {
    console.error("Failed to verify dashboard session", {
      ...details,
      error,
    });
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const authenticated = await hasSession(request);
  if (request.nextUrl.pathname.startsWith("/dashboard") && !authenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
