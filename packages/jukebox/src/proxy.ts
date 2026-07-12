import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

async function hasSession(request: NextRequest): Promise<boolean> {
  try {
    const sessionUrl = new URL(
      "/api/auth/get-session",
      process.env.API_INTERNAL_URL ?? "http://localhost:8083",
    );
    const response = await fetch(sessionUrl, {
      headers: {
        cookie: request.headers.get("cookie") ?? "",
        "x-forwarded-host":
          request.headers.get("host") ?? request.nextUrl.host,
        "x-forwarded-proto": request.nextUrl.protocol.slice(0, -1),
      },
      cache: "no-store",
    });
    if (!response.ok) return false;
    const body = (await response.json()) as { session?: unknown } | null;
    return Boolean(body?.session);
  } catch (error) {
    console.error("Failed to verify dashboard session", error);
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
