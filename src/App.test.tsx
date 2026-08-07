// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

vi.mock("./lib/storage", () => ({
  loadAppState: vi.fn().mockResolvedValue(null),
  saveAppState: vi.fn().mockResolvedValue(undefined),
}));

describe("app view navigation", () => {
  beforeEach(() => {
    document.documentElement.className = "";
  });

  afterEach(cleanup);

  it("opens Medicine from Record and returns to the clock", async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Open medicine" })).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Save current view as PNG" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open medicine" }));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("A Hard Day's medicine");
    const medicineView = screen.getByRole("region", { name: "Color medicine" });
    expect(medicineView).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Back to clock" }));
    expect(screen.queryByRole("region", { name: "Color medicine" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).not.toHaveTextContent("medicine");

    fireEvent.click(screen.getByRole("button", { name: "Open medicine" }));
    expect(screen.getByRole("region", { name: "Color medicine" })).toBe(medicineView);
  });
});
