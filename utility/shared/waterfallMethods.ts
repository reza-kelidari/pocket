/**
 * @fileoverview Waterfall Data Computation
 *
 * Builds the monthly income/expense waterfall used by the Profit tab's
 * chart, both in its pure historical form ({@link calculateWaterfallData})
 * and in its forecast-extended form ({@link extendWaterfallWithForecast}).
 *
 * ### Data model
 *
 * The waterfall is always scoped to the **current Jalali year** — 12
 * monthly columns, one per Jalali month, plus an optional total column
 * rendered by the chart component. Each {@link WaterfallMonth} carries:
 *
 * - its raw `income` and `expense` figures,
 * - the derived net `value` (`income − expense`),
 * - the `startLevel` / `endLevel` cumulative floor/ceiling used to draw
 *   the floating bar,
 * - a set of flags (`isPositive`, `isCurrentMonth`, `isForecast`) used
 *   by the chart to colour and style the column.
 *
 * ### Historical vs. forecast
 *
 * {@link calculateWaterfallData} emits all 12 months with their observed
 * figures. Months with no data simply contribute `0`.
 *
 * {@link extendWaterfallWithForecast} refines this: months up to and
 * including the current Jalali month keep their observed values, and the
 * remaining months are filled with predictions produced by
 * {@link forecastSeries}. Monthly **income** and **expense** are
 * forecast independently, so the projected net (`income − expense`) is
 * always consistent with the two underlying series. Each predicted
 * month is flagged `isForecast: true` so the chart can render it
 * distinctly.
 *
 * @module utility/shared/waterfallMethods
 */

import { toGregorian, toJalaali } from "jalaali-js";
import { TransactionType } from "./transactionTypes";
import { forecastSeries, type ForecastMethod } from "./forecastMethods";

/** Short Persian labels for the twelve Jalali months. */
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

/**
 * One monthly column in the waterfall.
 *
 * Fields starting with `is` are presentation flags consumed by
 * {@link WaterfallChart}; the rest describe the underlying data.
 */
export interface WaterfallMonth {
  /** Jalali month number, 1–12. */
  month: number;
  /** Short Persian name of the month. */
  name: string;
  /** Net income − expense for this month, in Rials. */
  value: number;
  /** Gross income (money received) for this month, in Rials. */
  income: number;
  /** Gross expense (money paid) for this month, in Rials. */
  expense: number;
  /** Cumulative net before this month. */
  startLevel: number;
  /** Cumulative net after this month. */
  endLevel: number;
  /** `true` when this month's net is non-negative. */
  isPositive: boolean;
  /** `true` for the current Jalali month. */
  isCurrentMonth?: boolean;
  /** `true` when `income` / `expense` are predictions, not observations. */
  isForecast?: boolean;
}

/** Full waterfall dataset for a single Jalali year. */
export interface WaterfallData {
  months: WaterfallMonth[];
  /** Year-to-date net (sum of every month's `value`). */
  total: number;
  /** `true` when {@link WaterfallData.total} is non-negative. */
  totalIsPositive: boolean;
  /** The Jalali year this dataset belongs to. */
  year: number;
}

/**
 * Returns the `[start, end)` timestamps of a Jalali month, in the
 * server's local timezone.
 *
 * The upper bound is exclusive: it is the start of the next Jalali
 * month, so a month spans `[startTs, endTs)`.
 *
 * @param year  - The Jalali year.
 * @param month - The Jalali month (1–12).
 * @returns A two-element tuple `[startTs, endTs]`.
 */
export function getJalaliMonthTimestamps(
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

/**
 * Sums the income and expense of every month in a Jalali year from a
 * flat list of transactions.
 *
 * Only `debit` (income) and `credit` (expense) transactions are
 * considered; `transfer` and `initial` transactions are ignored, which
 * matches the rest of the app's profit/loss semantics.
 *
 * @param transactions - All non-transfer transactions.
 * @param year - The Jalali year to bucket into.
 * @returns An array of 12 `[income, expense]` pairs, one per month.
 */
function sumMonthlyIncomeExpense(
  transactions: TransactionType[],
  year: number,
): Array<[number, number]> {
  const perMonth: Array<[number, number]> = Array.from({ length: 12 }, () => [
    0, 0,
  ]);
  for (let month = 1; month <= 12; month++) {
    const [startTs, endTs] = getJalaliMonthTimestamps(year, month);
    let income = 0;
    let expense = 0;
    for (const tx of transactions) {
      if (tx.time >= startTs && tx.time < endTs) {
        if (tx.type === "debit") income += tx.value;
        else if (tx.type === "credit") expense += tx.value;
      }
    }
    perMonth[month - 1] = [income, expense];
  }
  return perMonth;
}

/**
 * Extracts the current Jalali year and month from a "now" timestamp.
 *
 * @param now - A millisecond timestamp.
 * @returns `{ year, month }` for the current Jalali date.
 */
function getCurrentJalaliYearMonth(now: number): {
  year: number;
  month: number;
} {
  const d = new Date(now);
  const { jy, jm } = toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return { year: jy, month: jm };
}

/**
 * Builds the pure-historical waterfall for the current Jalali year.
 *
 * Every month is emitted, even those with no activity. Future months
 * simply contribute `0`, and `isForecast` is always `false`.
 *
 * @param transactions - All non-transfer transactions.
 * @param now - Optional "now" timestamp override (useful for tests).
 * @returns The 12-month waterfall for the current Jalali year.
 */
export function calculateWaterfallData(
  transactions: TransactionType[],
  now: number = Date.now(),
): WaterfallData {
  const { year: currentYear, month: currentMonth } =
    getCurrentJalaliYearMonth(now);

  const perMonth = sumMonthlyIncomeExpense(transactions, currentYear);

  const months: WaterfallMonth[] = [];
  let cumulative = 0;

  for (let month = 1; month <= 12; month++) {
    const [income, expense] = perMonth[month - 1];
    const pnl = income - expense;
    const startLevel = cumulative;
    const endLevel = cumulative + pnl;

    months.push({
      month,
      name: JALALI_MONTH_NAMES[month - 1],
      value: pnl,
      income,
      expense,
      startLevel,
      endLevel,
      isPositive: pnl >= 0,
      isCurrentMonth: month === currentMonth,
      isForecast: false,
    });

    cumulative = endLevel;
  }

  return {
    months,
    total: cumulative,
    totalIsPositive: cumulative >= 0,
    year: currentYear,
  };
}

/**
 * Extends the current year's waterfall with predicted values for the
 * remaining months.
 *
 * Only the current and past months carry observed values. The remaining
 * `12 − currentMonth` months are filled using {@link forecastSeries}
 * applied independently to the monthly income series and the monthly
 * expense series. Every predicted month is flagged `isForecast: true`
 * so the chart can render it distinctly.
 *
 * When the current month is the last month of the year (`اسف`), there
 * is nothing left to forecast and the result is structurally identical
 * to {@link calculateWaterfallData}.
 *
 * @param transactions - All non-transfer transactions.
 * @param method - The forecasting method to apply.
 * @param now - Optional "now" timestamp override (useful for tests).
 * @returns A 12-month waterfall whose future months are predictions.
 */
export function extendWaterfallWithForecast(
  transactions: TransactionType[],
  method: ForecastMethod,
  now: number = Date.now(),
): WaterfallData {
  const { year: currentYear, month: currentMonth } =
    getCurrentJalaliYearMonth(now);

  const perMonth = sumMonthlyIncomeExpense(transactions, currentYear);

  // Build observed monthly income/expense series (months 1..currentMonth).
  const observedIncome: number[] = [];
  const observedExpense: number[] = [];
  for (let month = 1; month <= currentMonth; month++) {
    observedIncome.push(perMonth[month - 1][0]);
    observedExpense.push(perMonth[month - 1][1]);
  }

  // Forecast the remaining months.
  const remaining = 12 - currentMonth;
  const forecastIncome =
    remaining > 0 ? forecastSeries(observedIncome, method, remaining) : [];
  const forecastExpense =
    remaining > 0 ? forecastSeries(observedExpense, method, remaining) : [];

  const months: WaterfallMonth[] = [];
  let cumulative = 0;

  for (let month = 1; month <= 12; month++) {
    let income: number;
    let expense: number;
    let isForecast: boolean;

    if (month <= currentMonth) {
      income = observedIncome[month - 1];
      expense = observedExpense[month - 1];
      isForecast = false;
    } else {
      const idx = month - currentMonth - 1;
      income = forecastIncome[idx] ?? 0;
      expense = forecastExpense[idx] ?? 0;
      isForecast = true;
    }

    const pnl = income - expense;
    const startLevel = cumulative;
    const endLevel = cumulative + pnl;

    months.push({
      month,
      name: JALALI_MONTH_NAMES[month - 1],
      value: pnl,
      income,
      expense,
      startLevel,
      endLevel,
      isPositive: pnl >= 0,
      isCurrentMonth: month === currentMonth,
      isForecast,
    });

    cumulative = endLevel;
  }

  return {
    months,
    total: cumulative,
    totalIsPositive: cumulative >= 0,
    year: currentYear,
  };
}
