/**
 * One statement of what counts as an acceptable image. The file picker's
 * `accept` attribute, the drop handler, the web download, and the layer
 * preparation all read from here, so the rule and its error message agree.
 */
export const IMAGE_POLICY = {
  maxBytes: 20 * 1024 * 1024,
  maxImages: 10,
  mimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"],
} as const;

const MIME_TYPES = new Set<string>(IMAGE_POLICY.mimeTypes);

/** Value for an `<input type="file">` accept attribute. */
export const IMAGE_ACCEPT_ATTRIBUTE = IMAGE_POLICY.mimeTypes.join(",");

export function isAllowedImageType(type: string): boolean {
  return MIME_TYPES.has(type.trim().toLowerCase());
}

export function isWithinImageSize(bytes: number): boolean {
  return bytes <= IMAGE_POLICY.maxBytes;
}

/** How many more images may be placed alongside `currentCount` existing ones. */
export function remainingImageSlots(currentCount: number): number {
  return Math.max(0, IMAGE_POLICY.maxImages - currentCount);
}
