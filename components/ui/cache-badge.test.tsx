import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect } from "vitest";
import { CacheBadge } from "./cache-badge";

describe("CacheBadge", () => {
  it("renders when visible with default text and title", () => {
    render(<CacheBadge visible={true} title="Cached • TTL 3m" />);

    const badge = screen.getByText("Cached");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute("title", "Cached • TTL 3m");
  });

  it("does not render when not visible", () => {
    render(<CacheBadge visible={false} />);

    expect(screen.queryByText("Cached")).not.toBeInTheDocument();
  });

  it("supports custom children and className", () => {
    render(
      <CacheBadge visible={true} title="TTL" className="test-class">
        Stored
      </CacheBadge>,
    );

    const badge = screen.getByText("Stored");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute("title", "TTL");
    expect(badge).toHaveClass("test-class");
  });
});
