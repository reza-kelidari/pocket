/**
 * @fileoverview Time and Jalali Calendar Utilities
 *
 * Provides helpers for:
 * - Converting between Persian/Arabic and English digits.
 * - Converting between Gregorian `Date` objects and Jalali date arrays.
 * - Building Unix timestamps (ms) for Jalali dates in the Tehran timezone.
 * - Computing the **lower** and **upper** bounds of a time-window selector.
 *
 * Time-window selectors use a small integer convention:
 * - `-1`     = this Jalali month
 * - `-2`     = this Jalali year
 * - `36500`  = all time
 * - positive = last N days (inclusive of today)
 *
 * The Tehran timezone offset (+3:30) is applied consistently when
 * converting between Jalali dates and Unix timestamps, so a "day" always
 * starts at 00:00 Tehran time.
 *
 * @module utility/shared/timeMethods
 */

import { toGregorian, toJalaali } from "jalaali-js";

/** Tehran's UTC offset in milliseconds (+03:30). */
const TEHRAN_OFFSET_MS = 3.5 * 60 * 60 * 1000;

/** Milliseconds in one day. */
const DAY_MS = 24 * 60 * 60 * 1000;

/** Sentinel value meaning "no upper bound". */
export const NO_UPPER_BOUND = Number.MAX_SAFE_INTEGER;

/**
 * Converts Persian (۰-۹) and Arabic (٠-٩) digits in a string to their
 * English (0-9) equivalents. All other characters are left untouched.
 *
 * @param value - The input string.
 * @returns The string with Persian/Arabic digits replaced by English digits.
 */
export function toEnglishDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d).toString())
    .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString());
}

/**
 * Converts a `Date` object to its Jalali `[year, month, day]` representation
 * in the Tehran timezone.
 *
 * @param date - The Gregorian date to convert.
 * @returns A three-element array: `[jalaliYear, jalaliMonth, jalaliDay]`.
 */
export function toJalaliDateArray(date: Date): number[] {
  const tehranMs = date.getTime() + TEHRAN_OFFSET_MS;
  const shifted = new Date(tehranMs);

  const { jy, jm, jd } = toJalaali(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth() + 1,
    shifted.getUTCDate(),
  );
  return [jy, jm, jd];
}

/**
 * Converts a Jalali date to the Unix timestamp (ms) of 00:00:00 that day
 * in the Tehran timezone.
 *
 * @param tuple - The Jalali `[year, month, day]` to convert.
 * @returns The Unix timestamp in milliseconds.
 */
export function jalaliToTimestamp([year, month, day]: [
  number,
  number,
  number,
]): number {
  const { gy, gm, gd } = toGregorian(year, month, day);

  const utcMidnight = Date.UTC(gy, gm - 1, gd);

  return utcMidnight - TEHRAN_OFFSET_MS;
}

/**
 * Returns the **inclusive lower bound** (start) of a time-window selector.
 *
 * - `-1` (this month): 00:00:00 of the first day of the current Jalali month.
 * - `-2` (this year):  00:00:00 of the first day of the current Jalali year.
 * - `36500` (all time): `0` (no lower bound).
 * - positive N:        00:00:00 of the day N-1 days before today.
 *
 * @param timeParam - The window selector.
 * @returns The Unix timestamp (ms) of the window's start.
 */
export function getCutoffTimestamp(timeParam: number): number {
  if (timeParam === 36500) {
    return 0;
  }

  const now = new Date();

  if (timeParam === -1) {
    const [year, month] = toJalaliDateArray(now);
    return jalaliToTimestamp([year, month, 1]);
  }

  if (timeParam === -2) {
    const [year] = toJalaliDateArray(now);
    return jalaliToTimestamp([year, 1, 1]);
  }

  const daysAgo = timeParam - 1;
  const shifted = new Date(now.getTime() - daysAgo * DAY_MS);
  const [y, m, d] = toJalaliDateArray(shifted);
  return jalaliToTimestamp([y, m, d]);
}

/**
 * Returns the **inclusive upper bound** (end) of a time-window selector.
 *
 * Unlike {@link getCutoffTimestamp}, this is only meaningful for the two
 * "current period" windows — every other window returns
 * {@link NO_UPPER_BOUND} so callers can skip adding an upper-bound filter.
 *
 * - `-1` (this month): 23:59:59.999 of the last day of the current Jalali
 *                      month, so future-dated transactions *within the
 *                      current month* are included.
 * - `-2` (this year):  23:59:59.999 of the last day of the current Jalali
 *                      year, so future-dated transactions *within the
 *                      current year* are included.
 * - anything else:     {@link NO_UPPER_BOUND}.
 *
 * @param timeParam - The window selector.
 * @returns The Unix timestamp (ms) of the window's end, or
 *          {@link NO_UPPER_BOUND} when the window has no upper bound.
 */
export function getUpperBoundTimestamp(timeParam: number): number {
  if (timeParam === -1) {
    const [year, month] = toJalaliDateArray(new Date());
    let nextMonth = month + 1;
    let nextYear = year;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }
    // 1ms before the start of the next Jalali month.
    return jalaliToTimestamp([nextYear, nextMonth, 1]) - 1;
  }

  if (timeParam === -2) {
    const [year] = toJalaliDateArray(new Date());
    // 1ms before the start of the next Jalali year.
    return jalaliToTimestamp([year + 1, 1, 1]) - 1;
  }

  return NO_UPPER_BOUND;
}

/**
 * Rounds a Unix timestamp (ms) down to 00:00:00 Tehran time of that day.
 *
 * @param ts - The Unix timestamp (ms) to round.
 * @returns The Unix timestamp (ms) of the start of that Tehran day.
 */
export function toTehranDayStart(ts: number): number {
  const shifted = ts + TEHRAN_OFFSET_MS;
  return Math.floor(shifted / DAY_MS) * DAY_MS - TEHRAN_OFFSET_MS;
}
