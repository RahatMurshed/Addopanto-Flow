/**
 * Translates raw database/RLS error messages into user-friendly text.
 */
const ERROR_MAP: [RegExp, string][] = [
  [/new row violates row-level security/i, "You don't have permission to perform this action."],
  [/violates row-level security/i, "You don't have permission to modify this record."],
  [/violates foreign key constraint/i, "This record is linked to other data and cannot be modified."],
  [/violates unique constraint/i, "A record with this information already exists."],
  [/violates check constraint/i, "The provided data is invalid. Please review your input."],
  [/permission denied/i, "You don't have permission to perform this action."],
  [/JWT expired/i, "Your session has expired. Please sign in again."],
  [/FetchError|Failed to fetch|NetworkError/i, "Network error. Please check your connection and try again."],
];

export function friendlyErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  for (const [pattern, friendly] of ERROR_MAP) {
    if (pattern.test(raw)) return friendly;
  }
  return raw;
}
