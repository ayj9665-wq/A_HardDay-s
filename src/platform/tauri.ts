import type { RunningApplication } from "../types";
import type { Platform } from "./types";

const STORE_FILE = "a-hard-days.json";

/** Must match FOREGROUND_CHANGED_EVENT in src-tauri/src/lib.rs. */
const FOREGROUND_CHANGED_EVENT = "application://foreground-changed";

type TauriStore = {
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
  save(): Promise<void>;
};

let storePromise: Promise<TauriStore> | null = null;
/** Asked once: whether this OS build implements application detection. */
let supportedPromise: Promise<boolean> | null = null;

function getStore(): Promise<TauriStore> {
  if (!storePromise) {
    storePromise = import("@tauri-apps/plugin-store").then(({ load }) =>
      load(STORE_FILE, { autoSave: false }),
    );
  }
  return storePromise;
}

async function invokeCommand<T>(command: string): Promise<T> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(command);
}

async function currentWindow() {
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  return getCurrentWindow();
}

/**
 * Desktop runtime. Every `@tauri-apps/*` import in the app lives here and stays
 * dynamic, so the browser bundle never pulls the desktop APIs.
 */
export const tauriPlatform: Platform = {
  kind: "desktop",

  storage: {
    async read(key) {
      const store = await getStore();
      return store.get<unknown>(key);
    },
    async write(key, value) {
      const store = await getStore();
      await store.set(key, value);
      await store.save();
    },
  },

  applications: {
    isSupported() {
      if (!supportedPromise) {
        supportedPromise = invokeCommand<boolean>("application_tracking_supported")
          .catch(() => false);
      }
      return supportedPromise;
    },
    async listRunning() {
      return invokeCommand<RunningApplication[]>("list_running_applications");
    },
    async getForeground() {
      return invokeCommand<RunningApplication | null>("get_foreground_application");
    },
    async onForegroundChange(listener) {
      const { listen } = await import("@tauri-apps/api/event");
      return listen<RunningApplication | null>(
        FOREGROUND_CHANGED_EVENT,
        (event) => listener(event.payload),
      );
    },
  },

  files: {
    async save({ data, suggestedName, dialogTitle, filter }) {
      const [{ save }, { writeFile }] = await Promise.all([
        import("@tauri-apps/plugin-dialog"),
        import("@tauri-apps/plugin-fs"),
      ]);
      const path = await save({
        title: dialogTitle,
        defaultPath: suggestedName,
        filters: [filter],
      });
      if (!path) return false;

      await writeFile(path, new Uint8Array(await data.arrayBuffer()));
      return true;
    },
  },

  shell: {
    async openExternal(url) {
      const { openUrl } = await import("@tauri-apps/plugin-opener");
      await openUrl(url);
    },
  },

  window: {
    supported: true,
    async setAlwaysOnTop(value) {
      await (await currentWindow()).setAlwaysOnTop(value);
    },
    async minimize() {
      await (await currentWindow()).minimize();
    },
    async toggleMaximize() {
      await (await currentWindow()).toggleMaximize();
    },
    async close() {
      await (await currentWindow()).close();
    },
  },
};
