import { AppError } from "../core/errors";
import { IMAGE_POLICY, isAllowedImageType, isWithinImageSize } from "../core/imagePolicy";

export type DroppedImageSource =
  | { kind: "file"; file: File }
  | { kind: "url"; url: string };

function isSupportedUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ||
      (url.protocol === "data:" && value.startsWith("data:image/"));
  } catch {
    return false;
  }
}

function parseUriList(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && isSupportedUrl(line));
}

function largestSrcsetCandidate(srcset: string) {
  const candidates = srcset.split(",").map((candidate) => {
    const [url, descriptor = ""] = candidate.trim().split(/\s+/, 2);
    const score = Number.parseFloat(descriptor) || 1;
    return { url, score };
  }).filter((candidate) => isSupportedUrl(candidate.url));
  return candidates.sort((a, b) => b.score - a.score)[0]?.url;
}

export function parseImageUrlsFromHtml(html: string): string[] {
  if (!html.trim()) return [];
  const document = new DOMParser().parseFromString(html, "text/html");
  const urls = [...document.querySelectorAll("img")].flatMap((image) => {
    const srcset = image.getAttribute("srcset") ?? image.getAttribute("data-srcset") ?? "";
    const src = image.getAttribute("src") ?? image.getAttribute("data-src") ??
      image.getAttribute("data-original") ?? "";
    const preferred = largestSrcsetCandidate(srcset) ?? src;
    return isSupportedUrl(preferred) ? [preferred] : [];
  });
  return [...new Set(urls)];
}

export function extractDroppedImageSources(dataTransfer: DataTransfer): DroppedImageSource[] {
  const files = [...dataTransfer.files]
    .filter((file) => isAllowedImageType(file.type))
    .map((file) => ({ kind: "file" as const, file }));
  if (files.length > 0) return files;

  const htmlUrls = parseImageUrlsFromHtml(dataTransfer.getData("text/html"));
  const uriUrls = parseUriList(dataTransfer.getData("text/uri-list"));
  const firefoxUrls = parseUriList(dataTransfer.getData("text/x-moz-url-data"));
  const plainUrls = parseUriList(dataTransfer.getData("text/plain"));
  const urls = htmlUrls.length > 0 ? htmlUrls : [...firefoxUrls, ...uriUrls, ...plainUrls];

  return [...new Set(urls)].map((url) => ({ kind: "url" as const, url }));
}

export async function downloadDroppedImage(url: string): Promise<File> {
  if (!isSupportedUrl(url)) throw new AppError("DOWNLOAD_UNSUPPORTED_URL");

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(url, {
      credentials: "omit",
      mode: url.startsWith("data:") ? "same-origin" : "cors",
      redirect: "follow",
      signal: controller.signal,
    });
    if (!response.ok) throw new AppError("DOWNLOAD_FAILED", { status: response.status });

    const declaredLength = Number(response.headers.get("content-length") ?? 0);
    if (!isWithinImageSize(declaredLength)) {
      throw new AppError("IMAGE_TOO_LARGE", { limitBytes: IMAGE_POLICY.maxBytes });
    }

    const blob = await response.blob();
    const contentType = (blob.type || response.headers.get("content-type") || "")
      .split(";", 1)[0]
      .toLowerCase();
    if (!isAllowedImageType(contentType)) {
      throw new AppError("DOWNLOAD_NOT_AN_IMAGE");
    }
    if (!isWithinImageSize(blob.size)) {
      throw new AppError("IMAGE_TOO_LARGE", { limitBytes: IMAGE_POLICY.maxBytes });
    }

    return new File([blob], fileNameFromUrl(url, contentType), { type: contentType });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new AppError("DOWNLOAD_TIMED_OUT");
    }
    if (error instanceof TypeError) {
      throw new AppError("DOWNLOAD_BLOCKED");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

function fileNameFromUrl(value: string, contentType: string) {
  const extension = contentType === "image/png" ? "png" :
    contentType === "image/webp" ? "webp" :
    contentType === "image/gif" ? "gif" : "jpg";
  if (value.startsWith("data:")) return `web-image.${extension}`;
  try {
    const tail = new URL(value).pathname.split("/").filter(Boolean).at(-1) ?? "web-image";
    const base = decodeURIComponent(tail).replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 80);
    return /\.(jpe?g|png|webp|gif)$/i.test(base) ? base : `${base || "web-image"}.${extension}`;
  } catch {
    return `web-image.${extension}`;
  }
}
