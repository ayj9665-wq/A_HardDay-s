// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { extractDroppedImageSources, parseImageUrlsFromHtml } from "./dropImages";

function transfer(data: Record<string, string>, files: File[] = []) {
  return {
    files,
    getData: (type: string) => data[type] ?? "",
  } as unknown as DataTransfer;
}

describe("dropped images", () => {
  it("prefers the largest image candidate from dragged HTML", () => {
    expect(parseImageUrlsFromHtml(`
      <a href="https://www.pinterest.com/pin/123">
        <img src="https://i.pinimg.com/236x/a.jpg"
          srcset="https://i.pinimg.com/236x/a.jpg 236w, https://i.pinimg.com/736x/a.jpg 736w">
      </a>
    `)).toEqual(["https://i.pinimg.com/736x/a.jpg"]);
  });

  it("uses local image files before duplicate URL data", () => {
    const file = new File(["image"], "local.png", { type: "image/png" });
    const sources = extractDroppedImageSources(transfer({
      "text/uri-list": "https://example.com/image.png",
    }, [file]));

    expect(sources).toEqual([{ kind: "file", file }]);
  });

  it("reads URL lists and ignores comments and page text", () => {
    const sources = extractDroppedImageSources(transfer({
      "text/uri-list": "# image\nhttps://example.com/first.jpg\nhttps://example.com/second.png",
      "text/plain": "not a URL",
    }));

    expect(sources).toEqual([
      { kind: "url", url: "https://example.com/first.jpg" },
      { kind: "url", url: "https://example.com/second.png" },
    ]);
  });

  it("does not mistake a Pinterest page link for an image when HTML contains an image", () => {
    const sources = extractDroppedImageSources(transfer({
      "text/html": '<a href="https://pinterest.com/pin/1"><img src="https://i.pinimg.com/originals/a.png"></a>',
      "text/uri-list": "https://pinterest.com/pin/1",
    }));

    expect(sources).toEqual([{ kind: "url", url: "https://i.pinimg.com/originals/a.png" }]);
  });
});
