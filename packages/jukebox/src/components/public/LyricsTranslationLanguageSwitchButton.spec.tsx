import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  HIDDEN_TRANSLATION_LANGUAGE_INDEX,
  LyricsTranslationLanguageSwitchButton,
} from "./LyricsTranslationLanguageSwitchButton";

vi.mock("next/font/google", () => ({
  Google_Sans_Flex: () => ({ className: "google-sans-flex" }),
}));

describe("LyricsTranslationLanguageSwitchButton", () => {
  it("shows a shadcn tooltip in the main document", async () => {
    render(
      <LyricsTranslationLanguageSwitchButton
        languages={["en"]}
        selectedLanguageIdx={HIDDEN_TRANSLATION_LANGUAGE_INDEX}
        onSelectedLanguageIdxChange={vi.fn()}
      />,
    );

    fireEvent.focus(screen.getByRole("button", { name: "Show translation" }));
    expect((await screen.findByRole("tooltip")).textContent).toBe(
      "Show translation",
    );
  });

  it("uses a native tooltip inside Document PiP", () => {
    render(
      <LyricsTranslationLanguageSwitchButton
        languages={["en"]}
        selectedLanguageIdx={HIDDEN_TRANSLATION_LANGUAGE_INDEX}
        onSelectedLanguageIdxChange={vi.fn()}
        useNativeTooltip
      />,
    );

    expect(
      screen
        .getByRole("button", { name: "Show translation" })
        .getAttribute("title"),
    ).toBe("Show translation");
    expect(screen.queryByRole("tooltip")).toBeNull();
  });
});
