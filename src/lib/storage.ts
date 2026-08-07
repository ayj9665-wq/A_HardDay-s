import type { AppState } from "../types";

const STORAGE_KEY = "a-hard-days-state";
const STORE_FILE = "a-hard-days.json";

type TauriStore = {
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
  save(): Promise<void>;
};

let storePromise: Promise<TauriStore> | null = null;

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && Boolean(window.__TAURI_INTERNALS__);
}

async function getTauriStore(): Promise<TauriStore> {
  if (!storePromise) {
    storePromise = import("@tauri-apps/plugin-store").then(({ load }) =>
      load(STORE_FILE, { autoSave: false }),
    );
  }
  return storePromise;
}

export async function loadAppState(): Promise<unknown> {
  if (isTauriRuntime()) {
    const store = await getTauriStore();
    return store.get<AppState>(STORAGE_KEY);
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}

export async function saveAppState(state: AppState): Promise<void> {
  if (isTauriRuntime()) {
    const store = await getTauriStore();
    await store.set(STORAGE_KEY, state);
    await store.save();
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
