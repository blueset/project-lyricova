import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PresentationWindowProvider } from "../../../hooks/usePresentationWindow";
import { BackgroundCanvas } from "./BackgroundCanvas";

vi.mock("../../../hooks/usePlayerState", () => ({
  usePlayerState: () => null,
}));

vi.mock("next/dynamic", () => ({
  default: () => () => null,
}));

describe("BackgroundCanvas", () => {
  beforeEach(() => {
    document.body.style.removeProperty("--brand-hue");
  });

  it("updates the active presentation document instead of the opener", async () => {
    const presentationDocument =
      document.implementation.createHTMLDocument("PiP");
    presentationDocument.body.style.setProperty("--brand-hue", "120");
    document.body.style.setProperty("--brand-hue", "240");
    const presentationWindow = {
      document: presentationDocument,
    } as unknown as Window;

    render(
      <PresentationWindowProvider value={presentationWindow}>
        <BackgroundCanvas
          textureUrl="texture.png"
          playerRef={{ current: document.createElement("audio") }}
        />
      </PresentationWindowProvider>,
    );

    await waitFor(() =>
      expect(
        presentationDocument.body.style.getPropertyValue("--brand-hue"),
      ).toBe(""),
    );
    expect(document.body.style.getPropertyValue("--brand-hue")).toBe("240");
  });
});
