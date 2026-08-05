import { describe, expect, it } from "vitest";
import { buildMenuTree } from "./LyricsSwitchButton";

describe("buildMenuTree", () => {
  it("keeps ungrouped entries at the root in declaration order", () => {
    expect(
      buildMenuTree([
        { value: "a", label: "A" },
        { value: "b", label: "B" },
      ]),
    ).toEqual([
      { type: "leaf", value: "a", label: "A" },
      { type: "leaf", value: "b", label: "B" },
    ]);
  });

  it("groups entries sharing a path and keeps the group at its first position", () => {
    expect(
      buildMenuTree([
        { value: "a", label: "A", path: ["G"] },
        { value: "b", label: "B" },
        { value: "c", label: "C", path: ["G"] },
      ]),
    ).toEqual([
      {
        type: "group",
        label: "G",
        children: [
          { type: "leaf", value: "a", label: "A" },
          { type: "leaf", value: "c", label: "C" },
        ],
      },
      { type: "leaf", value: "b", label: "B" },
    ]);
  });

  it("nests multi-segment paths", () => {
    expect(
      buildMenuTree([{ value: "a", label: "A", path: ["G", "H"] }]),
    ).toEqual([
      {
        type: "group",
        label: "G",
        children: [
          {
            type: "group",
            label: "H",
            children: [{ type: "leaf", value: "a", label: "A" }],
          },
        ],
      },
    ]);
  });

  it("keeps a leaf whose label collides with a group label separate", () => {
    expect(
      buildMenuTree([
        { value: "g", label: "G" },
        { value: "a", label: "A", path: ["G"] },
      ]),
    ).toEqual([
      { type: "leaf", value: "g", label: "G" },
      {
        type: "group",
        label: "G",
        children: [{ type: "leaf", value: "a", label: "A" }],
      },
    ]);
  });
});
