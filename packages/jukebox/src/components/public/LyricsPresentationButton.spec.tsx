import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LyricsPresentationButton } from "./LyricsPresentationButton";

const defaultProps = {
  isDocumentPictureInPictureOpening: false,
  isDocumentPictureInPictureSupported: false,
  mode: "normal" as const,
  onEnterDocumentPictureInPicture: vi.fn(),
  onEnterFullscreen: vi.fn(),
  onExitFullscreen: vi.fn(),
  onReturnToMainWindow: vi.fn(),
};

describe("LyricsPresentationButton", () => {
  it("keeps the fullscreen icon when Document PiP is unsupported", () => {
    const onEnterFullscreen = vi.fn();
    render(
      <LyricsPresentationButton
        {...defaultProps}
        onEnterFullscreen={onEnterFullscreen}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Fullscreen" }));
    expect(onEnterFullscreen).toHaveBeenCalledOnce();
    expect(
      screen.queryByRole("button", { name: "Lyrics display options" }),
    ).toBeNull();
  });

  it("keeps the existing fullscreen exit action", () => {
    const onExitFullscreen = vi.fn();
    render(
      <LyricsPresentationButton
        {...defaultProps}
        mode="fullscreen"
        onExitFullscreen={onExitFullscreen}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Exit Fullscreen" }));
    expect(onExitFullscreen).toHaveBeenCalledOnce();
  });

  it("shows the return action in Picture-in-Picture", () => {
    const onReturnToMainWindow = vi.fn();
    render(
      <LyricsPresentationButton
        {...defaultProps}
        mode="pictureInPicture"
        onReturnToMainWindow={onReturnToMainWindow}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Return to main window" }),
    );
    expect(onReturnToMainWindow).toHaveBeenCalledOnce();
  });

  it("shows a tooltip and both actions in the supported overflow menu", async () => {
    const onEnterFullscreen = vi.fn();
    const onEnterDocumentPictureInPicture = vi.fn();
    render(
      <LyricsPresentationButton
        {...defaultProps}
        isDocumentPictureInPictureSupported
        onEnterDocumentPictureInPicture={
          onEnterDocumentPictureInPicture
        }
        onEnterFullscreen={onEnterFullscreen}
      />,
    );

    const trigger = screen.getByRole("button", {
      name: "Lyrics display options",
    });
    fireEvent.focus(trigger);
    expect((await screen.findByRole("tooltip")).textContent).toBe(
      "Lyrics display options",
    );

    fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false });
    fireEvent.click(screen.getByText("Enter full screen"));
    expect(onEnterFullscreen).toHaveBeenCalledOnce();

    fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false });
    fireEvent.click(screen.getByText("Enter Picture-in-Picture"));
    expect(onEnterDocumentPictureInPicture).toHaveBeenCalledOnce();
  });
});
