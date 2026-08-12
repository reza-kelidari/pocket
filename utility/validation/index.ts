/**
 * Input validation and sanitization utilities.
 *
 * Provides functions to sanitize user-supplied values before they reach
 * the database layer. All functions validate **types**, **lengths**, and
 * **formats** before values are passed to the query builder.
 *
 * IMPORTANT:
 * - SQL injection is prevented by using parameterized queries (`$1`, `$2`, …)
 *   in the `pg` layer, NOT by this module. There is no reliable
 *   blacklist-based defense against SQL injection, so we don't pretend to
 *   offer one here — a blacklist mostly just breaks legitimate input
 *   (e.g. a transaction note containing the word "update" or "select").
 * - XSS is NOT handled here either. These functions only validate shape/
 *   length/format of data going into the database. Any value that is later
 *   rendered as HTML must be escaped (or use a framework that auto-escapes,
 *   e.g. React's default JSX text rendering) at the render layer.
 */

/** Maximum allowed length for general string fields. */
const MAX_STRING_LENGTH = 500;

/** Maximum allowed length for notes/descriptions. */
const MAX_NOTE_LENGTH = 1000;

/** Maximum allowed length for names (accounts, tags, transactions). */
const MAX_NAME_LENGTH = 50;

/** Minimum allowed timestamp (year 2000). Hoisted to avoid per-call allocation. */
const TIMESTAMP_MIN = new Date("2000-01-01").getTime();

/** Maximum allowed timestamp (year 2100). Hoisted to avoid per-call allocation. */
const TIMESTAMP_MAX = new Date("2100-01-01").getTime();

/**
 * Regular expression matching plain decimal integers only.
 *
 * Rejects scientific notation (`1e5`), hexadecimal (`0x10`),
 * floating-point (`1.5`), and any other non-plain-integer format
 * that `Number()` would otherwise silently accept.
 */
const PLAIN_INTEGER_PATTERN = /^[+-]?\d+$/;

/**
 * Reasons a sanitize call can fail. Lets callers surface a specific,
 * actionable message in the UI instead of a generic "invalid input".
 */
export type SanitizeFailureReason =
  | "empty"
  | "too_long"
  | "too_short"
  | "invalid_type"
  | "invalid_format"
  | "out_of_range";

export type SanitizeResult<T> =
  | { valid: true; value: T }
  | { valid: false; reason: SanitizeFailureReason };

function ok<T>(value: T): SanitizeResult<T> {
  return { valid: true, value };
}

function fail<T>(reason: SanitizeFailureReason): SanitizeResult<T> {
  return { valid: false, reason };
}

/**
 * Sanitizes a general-purpose string value.
 *
 * Trims whitespace and enforces a maximum length. Returns a result object
 * indicating success/failure and, on failure, why.
 *
 * Accepts strings and finite numbers — a transaction/account name can
 * legitimately be purely numeric (e.g. "1401") and, depending on the
 * input source (numeric `<input>`, JSON body, etc.), may arrive as a JS
 * `number` rather than a `string`. `NaN` and `Infinity` are explicitly
 * rejected so they never silently become the literal text `"NaN"` /
 * `"Infinity"`.
 *
 * @param value - The raw input value.
 * @param maxLength - Maximum allowed character count (default: {@link MAX_STRING_LENGTH}).
 */
export function sanitizeString(
  value: unknown,
  maxLength: number = MAX_STRING_LENGTH,
): SanitizeResult<string> {
  if (value === null || value === undefined) return fail("empty");

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return fail("invalid_format");
    return sanitizeString(String(value), maxLength);
  }

  if (typeof value !== "string") return fail("invalid_type");
  const str = value.trim();
  if (str.length === 0) return fail("empty");
  if (str.length > maxLength) return fail("too_long");
  return ok(str);
}

/**
 * Sanitizes a name field (account name, tag name, transaction name).
 */
export function sanitizeName(value: unknown): SanitizeResult<string> {
  return sanitizeString(value, MAX_NAME_LENGTH);
}

/**
 * Sanitizes a note/description field.
 */
export function sanitizeNote(value: unknown): SanitizeResult<string> {
  return sanitizeString(value, MAX_NOTE_LENGTH);
}

/**
 * Validates and converts a value to a safe integer.
 *
 * Only accepts actual numbers or strings that represent a plain decimal
 * integer — rejects booleans, arrays, objects, empty strings (which
 * `Number()` would otherwise silently coerce to `0`), scientific notation
 * (`"1e5"`), hexadecimal (`"0x10"`), and floating-point (`"1.5"`).
 *
 * @param value - The raw value to parse.
 * @param min - Minimum allowed value (inclusive). Default: `0`.
 * @param max - Maximum allowed value (inclusive). Default: `Number.MAX_SAFE_INTEGER`.
 */
export function sanitizeInteger(
  value: unknown,
  min: number = 0,
  max: number = Number.MAX_SAFE_INTEGER,
): SanitizeResult<number> {
  if (value === null || value === undefined) return fail("empty");

  if (typeof value === "number") {
    if (!Number.isFinite(value) || !Number.isInteger(value))
      return fail("invalid_format");
    if (value < min || value > max) return fail("out_of_range");
    return ok(value);
  }

  if (typeof value !== "string") return fail("invalid_type");

  const trimmed = value.trim();
  if (trimmed === "") return fail("empty");

  // Reject "1e5", "0x10", "1.5", etc. Only plain decimal integers pass.
  if (!PLAIN_INTEGER_PATTERN.test(trimmed)) return fail("invalid_format");

  const num = Number(trimmed);
  if (!Number.isSafeInteger(num)) return fail("invalid_format");
  if (num < min || num > max) return fail("out_of_range");
  return ok(num);
}

/**
 * Validates a transaction amount.
 *
 * Amounts are always non-negative — the direction of a transaction
 * (income/expense) is expressed elsewhere (e.g. a `type` field), not by
 * the sign of the amount. A negative value here almost always means a
 * bug upstream, so it is rejected rather than silently converted with
 * `Math.abs()`, which would hide that bug instead of surfacing it.
 *
 * @param value - The raw amount value.
 * @param max - Maximum allowed amount (inclusive). Default: `Number.MAX_SAFE_INTEGER`.
 */
export function sanitizeAmount(
  value: unknown,
  max: number = Number.MAX_SAFE_INTEGER,
): SanitizeResult<number> {
  return sanitizeInteger(value, 0, max);
}

/**
 * Validates a UUID string. Normalizes to lowercase so downstream
 * comparisons/storage are consistent regardless of input casing.
 *
 * @param value - The raw value to test.
 */
export function sanitizeUuid(value: unknown): SanitizeResult<string> {
  if (value === null || value === undefined) return fail("empty");
  if (typeof value !== "string") return fail("invalid_type");
  const str = value.trim();
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(str)) return fail("invalid_format");
  return ok(str.toLowerCase());
}

/**
 * Validates that a value is one of the allowed options.
 *
 * @param value - The raw value to test.
 * @param allowed - Array of allowed values.
 */
export function sanitizeEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
): SanitizeResult<T> {
  if (value === null || value === undefined) return fail("empty");
  if (typeof value !== "string") return fail("invalid_type");
  const str = value.trim();
  if (allowed.includes(str as T)) return ok(str as T);
  return fail("invalid_format");
}

/**
 * Validates a boolean-like value. Case-insensitive for string inputs
 * (accepts "true"/"True"/"TRUE", etc.).
 *
 * @param value - The raw value to test.
 */
export function sanitizeBoolean(value: unknown): SanitizeResult<boolean> {
  if (typeof value === "boolean") return ok(value);
  if (typeof value === "number") {
    if (value === 1) return ok(true);
    if (value === 0) return ok(false);
    return fail("invalid_format");
  }
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (v === "true" || v === "1") return ok(true);
    if (v === "false" || v === "0") return ok(false);
    return fail("invalid_format");
  }
  return fail("invalid_type");
}

/**
 * Validates a timestamp (milliseconds since epoch).
 *
 * Ensures the value is a positive integer within a reasonable range
 * (year 2000 to year 2100). The bounds are hoisted module-level
 * constants to avoid per-call `Date` allocation.
 *
 * @param value - The raw timestamp value.
 */
export function sanitizeTimestamp(value: unknown): SanitizeResult<number> {
  return sanitizeInteger(value, TIMESTAMP_MIN, TIMESTAMP_MAX);
}

export function sanitizeIdOrCategory(value: unknown): SanitizeResult<string> {
  if (value === null || value === undefined) return fail("empty");
  if (typeof value !== "string" && typeof value !== "number")
    return fail("invalid_type");
  const str = String(value).trim();
  if (!str) return fail("empty");

  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
  ) {
    return ok(str.toLowerCase());
  }
  if (/^\d+$/.test(str)) {
    return ok(str);
  }
  return fail("invalid_format");
}
