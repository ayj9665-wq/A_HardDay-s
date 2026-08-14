/**
 * Bump when a release changes the stored shape, and add the matching entry to
 * MIGRATIONS in the same commit. Never renumber an existing version: installs
 * in the wild are identified by these numbers.
 */
export const CURRENT_SCHEMA_VERSION = 1;

export type StoredEnvelope = {
  version: number;
  state: unknown;
};

/**
 * State written before versioning existed was stored bare, so anything without
 * an integer `version` is read as version 0 and migrated forward from there.
 */
export function readEnvelope(stored: unknown): StoredEnvelope {
  if (stored !== null && typeof stored === "object" && !Array.isArray(stored)) {
    const candidate = stored as { version?: unknown; state?: unknown };
    if (Number.isInteger(candidate.version) && "state" in candidate) {
      return { version: candidate.version as number, state: candidate.state };
    }
  }
  return { version: 0, state: stored };
}

export function writeEnvelope(state: unknown): StoredEnvelope {
  return { version: CURRENT_SCHEMA_VERSION, state };
}
