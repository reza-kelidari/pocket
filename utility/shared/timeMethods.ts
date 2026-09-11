import { toGregorian, toJalaali } from "jalaali-js";

const TEHRAN_OFFSET_MS = 3.5 * 60 * 60 * 1000;

const DAY_MS = 24 * 60 * 60 * 1000;

export function toEnglishDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d).toString())
    .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString());
}

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

export function jalaliToTimestamp([year, month, day]: [
  number,
  number,
  number,
]): number {
  const { gy, gm, gd } = toGregorian(year, month, day);

  const utcMidnight = Date.UTC(gy, gm - 1, gd);

  return utcMidnight - TEHRAN_OFFSET_MS;
}

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

export function toTehranDayStart(ts: number): number {
  const shifted = ts + TEHRAN_OFFSET_MS;
  return Math.floor(shifted / DAY_MS) * DAY_MS - TEHRAN_OFFSET_MS;
}
