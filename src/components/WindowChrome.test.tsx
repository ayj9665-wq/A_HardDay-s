// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { WindowChrome } from "./WindowChrome";
import { setPlatform, type OperatingSystem, type Platform } from "../platform";
import { webPlatform } from "../platform/web";

const desktopOn = (os: OperatingSystem): Platform => ({
  ...webPlatform,
  kind: "desktop",
  os,
  window: { ...webPlatform.window, supported: true },
});

const buttonLabels = () =>
  screen.getAllByRole("button").map((button) => button.getAttribute("aria-label"));

afterEach(() => {
  cleanup();
  setPlatform(null);
});

describe("window controls", () => {
  it("puts close where the operating system puts it", () => {
    setPlatform(desktopOn("macos"));
    render(<WindowChrome />);
    expect(buttonLabels()).toEqual([
      "Close window",
      "Minimize window",
      "Maximize or restore window",
    ]);

    cleanup();
    setPlatform(desktopOn("windows"));
    render(<WindowChrome />);
    expect(buttonLabels()).toEqual([
      "Minimize window",
      "Maximize or restore window",
      "Close window",
    ]);
  });

  it("renders nothing in a window the app does not own", () => {
    setPlatform(webPlatform);
    const { container } = render(<WindowChrome />);

    expect(container).toBeEmptyDOMElement();
  });
});
