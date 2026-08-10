import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FORWARDED_HEADERS = [
  "content-type",
  "content-length",
  "cookie",
  "origin",
  "sec-fetch-site",
  "cf-connecting-ip",
  "x-forwarded-for",
] as const;

interface StreamingRequestInit extends RequestInit {
  duplex: "half";
}

function uploadRequestHeaders(request: Request): Headers {
  const headers = new Headers();
  for (const name of FORWARDED_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const requestUrl = new URL(request.url);
  headers.set(
    "x-forwarded-host",
    request.headers.get("host") ?? requestUrl.host,
  );
  headers.set("x-forwarded-proto", requestUrl.protocol.slice(0, -1));
  return headers;
}

export async function forwardMusicUpload(
  request: Request,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  const uploadUrl = new URL(
    "/api/files/upload",
    process.env.API_INTERNAL_URL ?? "http://localhost:8083",
  );
  try {
    const init: StreamingRequestInit = {
      method: "POST",
      headers: uploadRequestHeaders(request),
      body: request.body,
      redirect: "manual",
      signal: request.signal,
      duplex: "half",
    };
    const response = await fetchImpl(uploadUrl, init);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        "content-type":
          response.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (error) {
    if (request.signal.aborted) {
      return new Response(null, { status: 499 });
    }
    console.error("Failed to forward music upload", error);
    return Response.json(
      { message: "Music upload service is unavailable." },
      { status: 502 },
    );
  }
}

export function POST(request: NextRequest): Promise<Response> {
  return forwardMusicUpload(request);
}
