import { normalizeState } from "../tasks";
import { getPlatform } from "../../platform";
import type { AppState } from "../../types";
import { migrateToCurrent } from "./migrations";
import { writeEnvelope } from "./schema";

export const STORAGE_KEY = "a-hard-days-state";

export { CURRENT_SCHEMA_VERSION } from "./schema";

/** Reads, migrates, then validates. Callers always receive usable state. */
export async function loadAppState(): Promise<AppState> {
  const stored = await getPlatform().storage.read(STORAGE_KEY);
  return normalizeState(migrateToCurrent(stored));
}

export async function saveAppState(state: AppState): Promise<void> {
  await getPlatform().storage.write(STORAGE_KEY, writeEnvelope(state));
}
