/** Columns that should be cast from string/numeric to JS number in responses. */
export const NUMERIC_FIELDS: Record<string, string[]> = {
  accounts: ["order"],
  transactions: ["time", "value"],
  tags: ["order"],
};

/**
 * Casts numeric fields in a database row to JS numbers and normalizes
 * `NULL` values to `0` (for numeric fields) or `""` (for string fields).
 *
 * @param row - The raw database row to normalize (mutated in place).
 * @param store - The store name, used to determine which fields are numeric.
 */
export function castNumericFields<T extends Record<string, unknown>>(
  row: T | null | undefined,
  store: string,
): T | null | undefined {
  if (!row) return row;

  const fields = NUMERIC_FIELDS[store] || [];
  for (const key of Object.keys(row)) {
    if (row[key] === null) {
      (row as any)[key] = fields.includes(key) ? 0 : "";
    } else if (fields.includes(key)) {
      (row as any)[key] = Number(row[key]);
    }
  }
  return row;
}
