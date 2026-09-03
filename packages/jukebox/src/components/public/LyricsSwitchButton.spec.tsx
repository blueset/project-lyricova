import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LyricsSwitchButton } from "./LyricsSwitchButton";

describe("LyricsSwitchButton", () => {
  it("uses an owner-document native selector for PiP", () => {
    const onChange = vi.fn();
    render(
      <LyricsSwitchButton
        items={[
          { label: "Focused", path: ["Classic"], value: "focused" },
          { label: "Glyph", path: ["Alpha"], value: "glyph" },
        ]}
        value="focused"
        onChange={onChange}
        useNativeSelect
      />,
    );

    const select = screen.getByRole("combobox", { name: "Lyrics renderer" });
    expect(select.ownerDocument).toBe(document);
    expect(
      screen.getByRole("option", { name: "Classic / Focused" }),
    ).toBeTruthy();

    fireEvent.change(select, { target: { value: "glyph" } });
    expect(onChange).toHaveBeenCalledWith("glyph");
  });
});
