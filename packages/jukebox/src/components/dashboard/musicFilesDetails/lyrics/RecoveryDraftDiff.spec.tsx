import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import RecoveryDraftDiff from "./RecoveryDraftDiff";

describe("RecoveryDraftDiff", () => {
  it("renders nothing when the saved and draft values match", () => {
    const view = render(
      <RecoveryDraftDiff title="LRC" savedValue="same" draftValue="same" />,
    );

    expect(view.container.childElementCount).toBe(0);
  });

  it("keeps a changed diff collapsed until requested", () => {
    render(
      <RecoveryDraftDiff
        title="LRCX"
        savedValue="saved text"
        draftValue="draft text"
      />,
    );

    const trigger = screen.getByRole("button", { name: "LRCX changes" });
    expect(trigger.getAttribute("data-state")).toBe("closed");
    expect(screen.queryByText("Saved only")).toBeNull();

    fireEvent.click(trigger);

    expect(trigger.getAttribute("data-state")).toBe("open");
    expect(screen.getByText("save").className).toContain("line-through");
    expect(screen.getByText("raft").className).not.toContain("line-through");
  });
});
