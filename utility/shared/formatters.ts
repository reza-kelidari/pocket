import { jalaliToTimestamp, toEnglishDigits, toJalaliDateArray } from "@/utility/time/methods";

export const toPersianDigits = (value: string) =>
  value.replace(/\d/g, (d) => Number(d).toLocaleString("fa-IR"));

export function formatJalaliDate(timestamp: number): string {
  if (!timestamp) return "";
  const [year, month, day] = toJalaliDateArray(new Date(timestamp));
  return toPersianDigits(
    `${year}/${month.toString().padStart(2, "0")}/${day.toString().padStart(2, "0")}`,
  );
}

export function formatTimeInput(timestamp: number): string {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return toPersianDigits(`${hours}:${minutes}`);
}

export function parseJalaliInput(formattedValue: string): number {
  const raw = toEnglishDigits(formattedValue).replace(/\D/g, "");
  if (raw.length !== 8) return 0;
  const year = parseInt(raw.slice(0, 4), 10);
  const month = parseInt(raw.slice(4, 6), 10);
  const day = parseInt(raw.slice(6, 8), 10);
  if (year >= 1300 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
    return jalaliToTimestamp([year, month, day]);
  }
  return 0;
}

export function parseTimeInput(formattedValue: string): number {
  const raw = toEnglishDigits(formattedValue).replace(/\D/g, "");
  if (raw.length !== 4) return 0;
  const hours = parseInt(raw.slice(0, 2), 10);
  const minutes = parseInt(raw.slice(2, 4), 10);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return 0;
  const now = new Date();
  now.setHours(hours, minutes, 0, 0);
  return now.getTime();
}

export function formatJalaliInput(value: string): string {
  const digits = toEnglishDigits(value).replace(/\D/g, "").slice(0, 8);
  let result = "";
  for (let i = 0; i < digits.length; i++) {
    if (i === 4 || i === 6) result += "/";
    result += digits[i];
  }
  return toPersianDigits(result);
}

export function formatTimeTyping(value: string): string {
  const digits = toEnglishDigits(value).replace(/\D/g, "").slice(0, 4);
  let result = "";
  for (let i = 0; i < digits.length; i++) {
    if (i === 2) result += ":";
    result += digits[i];
  }
  return toPersianDigits(result);
}

export function mergeDateTime(
  baseTimestamp: number,
  newTimestamp: number,
  part: "date" | "time",
): number {
  const base = new Date(baseTimestamp);
  const incoming = new Date(newTimestamp);
  const result = new Date(base);

  if (part === "date") {
    result.setFullYear(
      incoming.getFullYear(),
      incoming.getMonth(),
      incoming.getDate(),
    );
  } else {
    result.setHours(
      incoming.getHours(),
      incoming.getMinutes(),
      incoming.getSeconds(),
      0,
    );
  }
  return result.getTime();
}