import { toGregorian } from "jalaali-js";

export function toEnglishDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d).toString())
    .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString());
}

export function toJalaliDateArray(date: Date): number[] {
  return date
    .toLocaleDateString("fa-ir", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    })
    .split("/")
    .map((item) => Number(toEnglishDigits(item)));
}

export function pastDaysInYear(date: number[]): number {
  const [, month, day] = date;

  let days = day;

  if (month <= 6) days += (month - 1) * 31;
  if (month > 6 && month < 12) days += 186 + (month - 7) * 30;
  if (month === 12) days += 336;

  return days;
}

export function jalaliToTimestamp([year, month, day]: [
  number,
  number,
  number,
]): number {
  const { gy, gm, gd } = toGregorian(year, month, day);

  return new Date(gy, gm - 1, gd).getTime();
}
