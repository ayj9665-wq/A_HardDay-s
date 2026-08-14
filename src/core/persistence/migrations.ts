import { CURRENT_SCHEMA_VERSION, readEnvelope } from "./schema";

type StoredObject = Record<string, unknown>;

export type Migration = {
  /** The version this migration produces. */
  to: number;
  /** Why it exists, for whoever reads this list in a year. */
  describe: string;
  apply(state: StoredObject): StoredObject;
};

/**
 * Append-only, ordered by `to`. Editing a shipped migration rewrites history
 * for anyone who has not run it yet, so add a new one instead.
 */
export const MIGRATIONS: Migration[] = [
  {
    to: 1,
    describe: "Fold the glass mode and the transparent flag into backgroundMode",
    apply({ backgroundTransparent, backgroundMode, ...rest }) {
      const wasClear = backgroundMode === "glass" || backgroundTransparent === true;
      return wasClear
        ? { ...rest, backgroundMode: "clear" }
        : { ...rest, backgroundMode };
    },
  },
];

function isStoredObject(value: unknown): value is StoredObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Brings stored data up to the current shape. Validation is a separate concern:
 * whatever comes out still passes through normalizeState.
 */
export function migrateToCurrent(stored: unknown): unknown {
  const { version, state } = readEnvelope(stored);
  if (!isStoredObject(state)) return state;

  // A newer install may have written a version this build does not know about.
  // Leave that state alone and let normalization discard anything unusable.
  if (version > CURRENT_SCHEMA_VERSION) return state;

  return MIGRATIONS
    .filter((migration) => migration.to > version)
    .sort((first, second) => first.to - second.to)
    .reduce<StoredObject>((value, migration) => migration.apply(value), state);
}
