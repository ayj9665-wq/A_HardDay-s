import type { RunningApplication } from "../types";

/**
 * The contract every runtime must satisfy. Feature code depends on this shape
 * only, so a capability is written once instead of once per runtime check.
 */
export type Platform = {
  readonly kind: "desktop" | "web";
  readonly storage: StorageAdapter;
  readonly applications: ApplicationsAdapter;
  readonly files: FilesAdapter;
  readonly shell: ShellAdapter;
  readonly window: WindowAdapter;
};

export type StorageAdapter = {
  read(key: string): Promise<unknown>;
  write(key: string, value: unknown): Promise<void>;
};

export type ApplicationsAdapter = {
  /** False when the runtime cannot inspect other windows at all. */
  readonly supported: boolean;
  listRunning(): Promise<RunningApplication[]>;
  getForeground(): Promise<RunningApplication | null>;
};

export type SaveFileRequest = {
  data: Blob;
  suggestedName: string;
  dialogTitle: string;
  filter: { name: string; extensions: string[] };
};

export type FilesAdapter = {
  /** Resolves false when the user dismisses the save dialog. */
  save(request: SaveFileRequest): Promise<boolean>;
};

export type ShellAdapter = {
  openExternal(url: string): Promise<void>;
};

export type WindowAdapter = {
  /** False when the app runs inside a browser tab it does not own. */
  readonly supported: boolean;
  setAlwaysOnTop(value: boolean): Promise<void>;
  minimize(): Promise<void>;
  toggleMaximize(): Promise<void>;
  close(): Promise<void>;
};
