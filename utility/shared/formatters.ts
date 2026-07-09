import {
  jalaliToTimestamp,
  toEnglishDigits,
  toJalaliDateArray,
} from "@/utility/time/methods";

export const toPersianDigits = (value: string) =>
  value.replace(/\d/g, (d) => Number(d).toLocaleString("fa-IR"));

function isJalaliLeapYear(year: number): boolean {
  const r = year % 33;
  return (
    r === 1 ||
    r === 5 ||
    r === 9 ||
    r === 13 ||
    r === 17 ||
    r === 22 ||
    r === 26 ||
    r === 30
  );
}

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

// ==================== فرمت‌بندی هوشمند تاریخ ====================
export function formatJalaliInput(
  value: string,
  prevValue: string = "",
): string {
  const persianValue = toEnglishDigits(value).replace(/[^\d/]/g, "");
  // بررسی طول کل رشته (با اسلش‌ها) برای تشخیص دادن Backspace روی اسلش
  const prevPersianValue = toEnglishDigits(prevValue).replace(/[^\d/]/g, "");
  const isDeleting = persianValue.length < prevPersianValue.length;

  let parts = persianValue.split("/");
  let yearStr = parts[0]?.slice(0, 4) || "";
  let monthStr = parts[1]?.slice(0, 2) || "";
  let dayStr = parts[2]?.slice(0, 2) || "";

  // مدیریت کپی‌پیست بدون اسلش
  if (parts.length === 1) {
    const d = parts[0].slice(0, 8);
    if (d.length <= 4) yearStr = d;
    else if (d.length === 5) {
      yearStr = d.slice(0, 4);
      monthStr = d[4];
    } else if (d.length === 6) {
      yearStr = d.slice(0, 4);
      monthStr = d.slice(4, 6);
    } else if (d.length === 7) {
      yearStr = d.slice(0, 4);
      monthStr = d.slice(4, 6);
      dayStr = d[6];
    } else if (d.length === 8) {
      yearStr = d.slice(0, 4);
      monthStr = d.slice(4, 6);
      dayStr = d.slice(6, 8);
    }
  }

  // 1. پردازش سال
  if (yearStr.length > 0 && yearStr.length < 3) yearStr = "140";
  if (yearStr.length === 4 && parseInt(yearStr) < 1404) yearStr = "1404";

  let res = yearStr;
  let monthNum = 0;

  // اضافه کردن خودکار اسلش اول
  const showFirstSlash =
    persianValue.includes("/") ||
    monthStr.length > 0 ||
    (yearStr.length === 4 && !isDeleting);

  if (showFirstSlash) {
    res += "/";

    // 2. پردازش ماه
    if (monthStr.length > 0) {
      monthNum = parseInt(monthStr) || 0;
      if (monthStr.length === 1) {
        if (
          (monthStr === "0" || monthStr === "1" || monthStr === "2") &&
          !persianValue.endsWith("/")
        ) {
          res += monthStr;
          return toPersianDigits(res);
        } else {
          res += monthStr.padStart(2, "0");
          monthStr = monthStr.padStart(2, "0");
        }
      } else {
        monthNum = Math.min(12, monthNum);
        res += monthNum.toString().padStart(2, "0");
        monthStr = monthNum.toString().padStart(2, "0");
      }
    }

    // اضافه کردن خودکار اسلش دوم
    const monthComplete = monthStr.length === 2;
    const showSecondSlash =
      persianValue.includes("/", persianValue.indexOf("/") + 1) ||
      dayStr.length > 0 ||
      (monthComplete && !isDeleting);

    if (showSecondSlash) {
      res += "/";

      // 3. پردازش روز
      if (dayStr.length > 0) {
        const isLeap = isJalaliLeapYear(parseInt(yearStr) || 0);
        let maxDay = 31;
        if (monthNum > 6 && monthNum < 12) maxDay = 30;
        if (monthNum === 12) maxDay = isLeap ? 30 : 29;

        let dayNum = parseInt(dayStr) || 0;
        if (dayStr.length === 1) {
          if (dayStr === "0") {
            res += "0"; // اجازه میدهیم 0 تایپ شود تا منتظر بماند
            return toPersianDigits(res);
          } else if (
            (dayStr === "1" || dayStr === "2" || dayStr === "3") &&
            !persianValue.endsWith("/")
          ) {
            if (monthNum === 12 && !isLeap && dayStr === "3") {
              res += "03";
            } else {
              res += dayStr;
              return toPersianDigits(res);
            }
          } else {
            res += dayStr.padStart(2, "0");
          }
        } else {
          dayNum = Math.min(maxDay, dayNum);
          res += dayNum.toString().padStart(2, "0");
        }
      }
    }
  }

  return toPersianDigits(res);
}

// ==================== فرمت‌بندی هوشمند ساعت ====================
export function formatTimeTyping(
  value: string,
  prevValue: string = "",
): string {
  const persianValue = toEnglishDigits(value).replace(/[^\d:]/g, "");
  // بررسی طول کل رشته (با دونقطه) برای تشخیص دادن Backspace روی دونقطه
  const prevPersianValue = toEnglishDigits(prevValue).replace(/[^\d:]/g, "");
  const isDeleting = persianValue.length < prevPersianValue.length;

  let parts = persianValue.split(":");
  let hourStr = parts[0]?.slice(0, 2) || "";
  let minStr = parts[1]?.slice(0, 2) || "";

  // مدیریت کپی‌پیست بدون دونقطه
  if (parts.length === 1) {
    const d = parts[0].slice(0, 4);
    if (d.length <= 2) hourStr = d;
    else if (d.length === 3) {
      hourStr = d.slice(0, 2);
      minStr = d[2];
    } else if (d.length === 4) {
      hourStr = d.slice(0, 2);
      minStr = d.slice(2, 4);
    }
  }

  let res = hourStr;

  // 1. پردازش ساعت
  if (hourStr.length === 2) {
    let h = Math.min(23, parseInt(hourStr) || 0);
    res = h.toString().padStart(2, "0");
    hourStr = res;
  } else if (hourStr.length === 1) {
    if (parseInt(hourStr) >= 3) {
      res = hourStr.padStart(2, "0");
      hourStr = res;
    } else {
      res = hourStr;
      return toPersianDigits(res);
    }
  }

  // اضافه کردن خودکار دونقطه
  const hourComplete = hourStr.length === 2;
  const showColon =
    persianValue.includes(":") ||
    minStr.length > 0 ||
    (hourComplete && !isDeleting);

  if (showColon) {
    res += ":";

    // 2. پردازش دقیقه
    if (minStr.length > 0) {
      if (minStr.length === 1) {
        if (parseInt(minStr) >= 6) {
          res += minStr.padStart(2, "0");
        } else {
          res += minStr;
        }
      } else {
        let m = Math.min(59, parseInt(minStr) || 0);
        res += m.toString().padStart(2, "0");
      }
    }
  }

  return toPersianDigits(res);
}
