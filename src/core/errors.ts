/**
 * Every failure the app can surface, mapped to the data its message needs.
 * Domain and platform code throws these codes; only the UI layer turns a code
 * into words, so a message exists once and stays translatable.
 */
export type AppErrorDetails = {
  IMAGE_UNSUPPORTED_TYPE: undefined;
  IMAGE_TOO_LARGE: { limitBytes: number };
  IMAGE_UNREADABLE: undefined;
  IMAGE_LIMIT_REACHED: { max: number };
  IMAGE_LIMIT_TRUNCATED: { added: number; max: number };
  IMAGE_IMPORT_FAILED: undefined;
  DROP_NOT_AN_IMAGE: undefined;
  DOWNLOAD_UNSUPPORTED_URL: undefined;
  DOWNLOAD_FAILED: { status: number };
  DOWNLOAD_NOT_AN_IMAGE: undefined;
  DOWNLOAD_TIMED_OUT: undefined;
  DOWNLOAD_BLOCKED: undefined;
  ANALYSIS_UNAVAILABLE: undefined;
  ANALYSIS_NO_COLORS: undefined;
  ANALYSIS_FAILED: undefined;
  PNG_ENCODING_FAILED: undefined;
  MUSIC_URL_UNSUPPORTED: undefined;
  MUSIC_OPEN_FAILED: undefined;
  CLIPBOARD_COPY_FAILED: { hex: string };
  APPLICATIONS_UNREADABLE: undefined;
  TASK_TEXT_EMPTY: undefined;
  TASK_LIMIT_REACHED: { max: number };
  TASK_HOUR_TAKEN: { hour: number };
  TASK_HOUR_MISSING: undefined;
};

export type AppErrorCode = keyof AppErrorDetails;

/** Codes that carry no details, so they are safe to raise without arguments. */
export type SimpleErrorCode = {
  [C in AppErrorCode]: undefined extends AppErrorDetails[C] ? C : never;
}[AppErrorCode];

type DetailArgs<C extends AppErrorCode> = undefined extends AppErrorDetails[C]
  ? [details?: AppErrorDetails[C]]
  : [details: AppErrorDetails[C]];

export class AppError<C extends AppErrorCode = AppErrorCode> extends Error {
  readonly code: C;
  readonly details: AppErrorDetails[C];

  constructor(code: C, ...[details]: DetailArgs<C>) {
    // The code doubles as the message so an unhandled throw still identifies itself.
    super(code);
    this.name = "AppError";
    this.code = code;
    this.details = details as AppErrorDetails[C];
  }
}

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}

/** Wraps anything a `catch` block received, so unknown throwables never reach the UI verbatim. */
export function toAppError(value: unknown, fallback: SimpleErrorCode): AppError {
  return isAppError(value) ? value : new AppError(fallback as AppErrorCode);
}
