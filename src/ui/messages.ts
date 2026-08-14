import {
  toAppError,
  type AppError,
  type AppErrorCode,
  type AppErrorDetails,
  type SimpleErrorCode,
} from "../core/errors";

type Message<C extends AppErrorCode> = string | ((details: AppErrorDetails[C]) => string);

const MEGABYTE = 1024 * 1024;

/**
 * The single copy catalogue. Adding a code without a message is a type error,
 * and translating the app means replacing this file only.
 */
const ERROR_MESSAGES: { [C in AppErrorCode]: Message<C> } = {
  IMAGE_UNSUPPORTED_TYPE: "Drop PNG, JPG, WEBP, or GIF images.",
  IMAGE_TOO_LARGE: ({ limitBytes }) =>
    `Each image must be smaller than ${Math.round(limitBytes / MEGABYTE)} MB.`,
  IMAGE_UNREADABLE: "An image could not be read.",
  IMAGE_LIMIT_REACHED: ({ max }) => `You can place up to ${max} images.`,
  IMAGE_LIMIT_TRUNCATED: ({ added, max }) =>
    `Only the first ${added} images were added. Max ${max}.`,
  IMAGE_IMPORT_FAILED: "Image import failed.",
  DROP_NOT_AN_IMAGE: "Drop a JPG or PNG image, not a web page.",
  DOWNLOAD_UNSUPPORTED_URL: "The dropped URL is not a supported image.",
  DOWNLOAD_FAILED: ({ status }) => `Image download failed (${status}).`,
  DOWNLOAD_NOT_AN_IMAGE: "The dropped URL did not return a JPG or PNG image.",
  DOWNLOAD_TIMED_OUT: "Image download timed out.",
  DOWNLOAD_BLOCKED: "This website blocked image import. Try copy and paste.",
  ANALYSIS_UNAVAILABLE: "Color analysis is not available.",
  ANALYSIS_NO_COLORS: "No visible colors found.",
  ANALYSIS_FAILED: "Color analysis failed.",
  PNG_ENCODING_FAILED: "PNG encoding failed.",
  MUSIC_URL_UNSUPPORTED: "Unsupported music URL.",
  MUSIC_OPEN_FAILED: "YouTube Music could not be opened.",
  CLIPBOARD_COPY_FAILED: ({ hex }) => `Copy failed. Color: ${hex}`,
  APPLICATIONS_UNREADABLE: "Running applications could not be read.",
  TASK_TEXT_EMPTY: "A task cannot be empty.",
  TASK_LIMIT_REACHED: ({ max }) => `You can add up to ${max} tasks.`,
  TASK_HOUR_TAKEN: ({ hour }) => `${hour}'o is already occupied.`,
  TASK_HOUR_MISSING: "Please select a time slot.",
};

/** Derived from the catalogue itself, so tests cannot drift out of sync with it. */
export const ERROR_CODES = Object.keys(ERROR_MESSAGES) as AppErrorCode[];

export function messageForError(error: AppError): string {
  const message = ERROR_MESSAGES[error.code];
  // The catalogue is keyed by code, so details always match the formatter here.
  return typeof message === "string"
    ? message
    : (message as (details: unknown) => string)(error.details);
}

/** Turns whatever a `catch` block received into copy, without leaking raw messages. */
export function errorMessage(error: unknown, fallback: SimpleErrorCode): string {
  return messageForError(toAppError(error, fallback));
}
