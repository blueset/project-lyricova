import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

describe("vitest smoke", () => {
  it("renders into jsdom with jest-dom matchers", () => {
    render(<div>hello vitest</div>);
    expect(screen.getByText("hello vitest")).toBeInTheDocument();
  });
});
