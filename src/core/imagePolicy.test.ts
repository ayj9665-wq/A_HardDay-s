import { describe, expect, it } from "vitest";
import {
  IMAGE_ACCEPT_ATTRIBUTE,
  IMAGE_POLICY,
  isAllowedImageType,
  isWithinImageSize,
  remainingImageSlots,
} from "./imagePolicy";

describe("image policy", () => {
  it("offers the file picker exactly the types it will then accept", () => {
    const offered = IMAGE_ACCEPT_ATTRIBUTE.split(",");

    expect(offered).toHaveLength(IMAGE_POLICY.mimeTypes.length);
    for (const type of offered) {
      expect(isAllowedImageType(type), `${type} is offered but rejected`).toBe(true);
    }
  });

  it("rejects image types outside the policy", () => {
    expect(isAllowedImageType("image/bmp")).toBe(false);
    expect(isAllowedImageType("text/html")).toBe(false);
    expect(isAllowedImageType("")).toBe(false);
  });

  it("ignores casing and padding the browser may report", () => {
    expect(isAllowedImageType(" IMAGE/PNG ")).toBe(true);
  });

  it("treats the size limit as inclusive", () => {
    expect(isWithinImageSize(IMAGE_POLICY.maxBytes)).toBe(true);
    expect(isWithinImageSize(IMAGE_POLICY.maxBytes + 1)).toBe(false);
  });

  it("never reports negative capacity once the stage is full", () => {
    expect(remainingImageSlots(0)).toBe(IMAGE_POLICY.maxImages);
    expect(remainingImageSlots(IMAGE_POLICY.maxImages)).toBe(0);
    expect(remainingImageSlots(IMAGE_POLICY.maxImages + 3)).toBe(0);
  });
});
