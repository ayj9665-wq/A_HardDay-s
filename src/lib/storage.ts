import { getPlatform } from "../platform";
import type { AppState } from "../types";

const STORAGE_KEY = "a-hard-days-state";

export async function loadAppState(): Promise<unknown> {
  return getPlatform().storage.read(STORAGE_KEY);
}

export async function saveAppState(state: AppState): Promise<void> {
  await getPlatform().storage.write(STORAGE_KEY, state);
}
