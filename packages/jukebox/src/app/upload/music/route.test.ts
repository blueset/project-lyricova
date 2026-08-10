import { describe, expect, it, vi } from "vitest";
import { forwardMusicUpload } from "./route";

interface StreamingRequestInit extends RequestInit {
  duplex: "half";
}

describe("music upload streaming route", () => {
  it("streams the multipart body and authentication headers to the API", async () => {
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("music"));
        controller.close();
      },
    });
    const requestInit: StreamingRequestInit = {
      method: "POST",
      headers: {
        "content-type": "multipart/form-data; boundary=test",
        "content-length": "5",
        cookie: "lyricova.session_token=session",
        origin: "https://jukebox.example",
        "sec-fetch-site": "same-origin",
      },
      body,
      duplex: "half",
    };
    const request = new Request(
      "https://jukebox.example/upload/music",
      requestInit,
    );
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({ id: 42 }, { status: 201 }),
    );

    const response = await forwardMusicUpload(request, fetchImpl);

    expect(response.status).toBe(201);
    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url.toString()).toBe("http://localhost:8083/api/files/upload");
    expect(init?.body).toBe(body);
    expect(new Headers(init?.headers).get("cookie")).toContain(
      "lyricova.session_token",
    );
    expect(new Headers(init?.headers).get("origin")).toBe(
      "https://jukebox.example",
    );
  });

  it("returns a safe gateway error when the API is unavailable", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const request = new Request("https://jukebox.example/upload/music", {
      method: "POST",
    });
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new Error("connection refused"));

    const response = await forwardMusicUpload(request, fetchImpl);

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      message: "Music upload service is unavailable.",
    });
    consoleError.mockRestore();
  });
});
