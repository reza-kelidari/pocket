import { toGregorian, toJalaali } from "jalaali-js";
import { TransactionType } from "./transactionTypes";

export const JALALI_MONTH_NAMES = [
  "فرو",
  "ارد",
  "خرد",
  "تیر",
  "مرد",
  "شهر",
  "مهر",
  "آبا",
  "آذر",
  "دی",
  "بهم",
  "اسف",
];

export const JALALI_MONTH_FULL_NAMES = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

export interface WaterfallMonth {
  month: number;
  name: string;
  value: number; // تغییر از pnl به value برای هماهنگی با Profit
  startLevel: number;
  endLevel: number;
  isPositive: boolean;
  isCurrentMonth?: boolean; // اضافه شدن فیلد اختیاری
}

export interface WaterfallData {
  months: WaterfallMonth[];
  total: number;
  totalIsPositive: boolean;
  year: number; // تغییر از jalaliYear به year
}

function getJalaliMonthTimestamps(
  year: number,
  month: number,
): [number, number] {
  const startGreg = toGregorian(year, month, 1);
  const start = new Date(
    startGreg.gy,
    startGreg.gm - 1,
    startGreg.gd,
  ).getTime();

  let endYear = year;
  let endMonth = month + 1;
  if (endMonth > 12) {
    endYear++;
    endMonth = 1;
  }
  const endGreg = toGregorian(endYear, endMonth, 1);
  const end = new Date(endGreg.gy, endGreg.gm - 1, endGreg.gd).getTime();

  return [start, end];
}

export function calculateWaterfallData(
  transactions: TransactionType[],
  now: number = Date.now(),
): WaterfallData {
  const nowDate = new Date(now);
  const { jy: currentJalaliYear, jm: currentJalaliMonth } = toJalaali(
    nowDate.getFullYear(),
    nowDate.getMonth() + 1,
    nowDate.getDate(),
  );

  const months: WaterfallMonth[] = [];
  let cumulative = 0;

  for (let month = 1; month <= 12; month++) {
    const [startTs, endTs] = getJalaliMonthTimestamps(currentJalaliYear, month);

    let monthIncome = 0;
    let monthExpense = 0;

    for (const tx of transactions) {
      if (tx.time >= startTs && tx.time < endTs) {
        if (tx.type === "debit") {
          monthIncome += tx.value;
        } else if (tx.type === "credit") {
          monthExpense += tx.value;
        }
      }
    }

    const pnl = monthIncome - monthExpense;
    const startLevel = cumulative;
    const endLevel = cumulative + pnl;

    months.push({
      month,
      name: JALALI_MONTH_NAMES[month - 1],
      value: pnl,
      startLevel,
      endLevel,
      isPositive: pnl >= 0,
      isCurrentMonth: month === currentJalaliMonth,
    });

    cumulative = endLevel;
  }

  return {
    months,
    total: cumulative,
    totalIsPositive: cumulative >= 0,
    year: currentJalaliYear, // استفاده از year
  };
}

export function getCurrentJalaliMonth(now: number = Date.now()): number {
  const nowDate = new Date(now);
  const { jm } = toJalaali(
    nowDate.getFullYear(),
    nowDate.getMonth() + 1,
    nowDate.getDate(),
  );
  return jm;
}
