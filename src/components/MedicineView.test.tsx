// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MedicineView } from "./MedicineView";
import { IMAGE_ACCEPT_ATTRIBUTE } from "../core/imagePolicy";

afterEach(cleanup);

describe("MedicineView", () => {
  it("invites a drop while the stage is empty", () => {
    render(<MedicineView />);

    expect(screen.getByText("DROP IMAGES")).toBeInTheDocument();
    expect(screen.queryByLabelText("Extracted color palette")).not.toBeInTheDocument();
  });

  it("offers the file picker exactly the formats the policy allows", () => {
    const { container } = render(<MedicineView />);
    const input = container.querySelector('input[type="file"]');

    expect(input).toHaveAttribute("accept", IMAGE_ACCEPT_ATTRIBUTE);
    expect(input).toHaveAttribute("multiple");
  });

  it("stays out of the accessibility tree while another view is showing", () => {
    render(<MedicineView hidden />);

    expect(screen.queryByRole("region", { name: "Color medicine" })).not.toBeInTheDocument();
  });
});
