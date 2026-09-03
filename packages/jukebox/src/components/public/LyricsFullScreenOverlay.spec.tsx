import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LyricsFullScreenOverlay } from "./LyricsFullScreenOverlay";
import { PresentationWindowProvider } from "../../hooks/usePresentationWindow";

const mocks = vi.hoisted(() => ({
  playerRef: { current: null as HTMLAudioElement | null },
}));

vi.mock("./AppContext", () => ({
  useAppContext: () => ({ playerRef: mocks.playerRef }),
}));

vi.mock("../../redux/public/store", () => ({
  useAppSelector: () => null,
}));

vi.mock("../../redux/public/playlist", () => ({
  currentSongSelector: () => null,
}));

describe("LyricsFullScreenOverlay", () => {
  beforeEach(() => {
    mocks.playerRef.current = document.createElement("audio");
  });

  it("retains orientation controls in fullscreen mode", () => {
    render(
      <LyricsFullScreenOverlay mode="fullscreen">
        <div>Controls</div>
      </LyricsFullScreenOverlay>,
    );

    expect(screen.getByText("0°")).toBeTruthy();
    expect(screen.getByText("90°")).toBeTruthy();
    expect(screen.getByText("Controls")).toBeTruthy();
  });

  it("removes orientation controls but retains the overlay in PiP mode", () => {
    render(
      <LyricsFullScreenOverlay mode="pictureInPicture">
        <div>PiP controls</div>
      </LyricsFullScreenOverlay>,
    );

    expect(screen.queryByText("0°")).toBeNull();
    expect(screen.getByText("PiP controls")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Rewind 5 seconds" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Forward 5 seconds" }),
    ).toBeTruthy();
  });

  it("does not treat the first PiP click as a double-click seek", () => {
    Object.defineProperty(mocks.playerRef.current, "currentTime", {
      configurable: true,
      writable: true,
      value: 10,
    });
    const presentationWindow = {
      clearTimeout: vi.fn(),
      document,
      performance: { now: () => 100 },
      setTimeout: vi.fn(() => 1),
    } as unknown as Window;
    const view = render(
      <PresentationWindowProvider value={presentationWindow}>
        <LyricsFullScreenOverlay mode="pictureInPicture" />
      </PresentationWindowProvider>,
    );
    const overlay = view.container.firstElementChild as HTMLDivElement;
    Object.defineProperty(overlay, "clientWidth", {
      configurable: true,
      value: 100,
    });

    fireEvent.click(overlay, { clientX: 75 });

    expect(mocks.playerRef.current?.currentTime).toBe(10);
    expect(presentationWindow.setTimeout).toHaveBeenCalled();
  });
});
