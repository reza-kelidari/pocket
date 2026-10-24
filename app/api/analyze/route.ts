/**
 * @fileoverview Advanced Analytics API Route
 *
 * Computes aggregated financial metrics for the "analyze" screen over a
 * requested time window. Returns five independent sections:
 *
 * - **cashflow** — income vs. expense for the current window and the
 *   equivalent previous window, used by the Cash-Flow tab.
 * - **income** / **expense** — per-category, per-tag breakdowns of money
 *   received and paid, plus a forecast of each side's future trend
 *   (see {@link ForecastBundle}), used by the Financial Analysis tab.
 * - **profit** — start balance, income, expense, net profit, end balance,
 *   and the current **cash-on-hand** figure (liquid money excluding
 *   `Book` accounts). Used by the Profit tab.
 * - **waterfall** — monthly cumulative profit/loss for the current Jalali
 *   year, used by the Profit tab's waterfall chart.
 * - **waterfallForecast** — the same waterfall extended into the
 *   remaining months of the year, one dataset per supported method.
 *   Drives the chart when a forecast method is selected.
 * - **profitForecast** — forecast **totals** scoped to the target
 *   window's horizon (matching the income/expense tabs), one entry per
 *   method. Drives the forecast summary block in the Profit tab so it
 *   stays consistent with what the Financial Analysis tab would show.
 *
 * ### Window-end behavior
 *
 * For the two "current period" windows (`-1` this month, `-2` this year),
 * the aggregation extends to the **end** of that period — not to today —
 * so future-dated transactions inside the period are counted. Other
 * windows end at "now", matching their "N days ago" semantics.
 *
 * ### Forecast horizon
 *
 * The forecast horizon mirrors the selected window's length:
 * - Any positive `N` (last N days) → now + (N + 1) days into the future.
 *   The horizon is computed dynamically from `timeParam`, so newly added
 *   window sizes (e.g. 180 days) are handled correctly without code
 *   changes.
 * - `-1` (this month) → through the end of next Jalali month.
 * - `-2` (this year) → through the end of the current Jalali year.
 * - `36500` (all time) → capped at 50% of the actual data span (minimum
 *   30 days), so the forecast never dominates the chart when the user
 *   has little historical data. The bucket size is also picked based on
 *   the actual data span (not since epoch), preventing the historical
 *   line from collapsing to a single bucket on short histories.
 *
 * ### `cashOnHand`
 *
 * Computed from the entire transaction history, ignoring future-dated
 * transactions and `Book` accounts (receivables / payables / funds-in-
 * transit). It represents the user's present liquid money.
 *
 * ### `projectedBalance` (no double-counting)
 *
 * The forecast summary's `projectedBalance` is computed as
 * `balanceAtNow + forecastProfit`, where `balanceAtNow` is the user's
 * total balance at the current instant (not at the end of the selected
 * window). This avoids double-counting the `[now, upperBound]` portion
 * of the forecast horizon, which previously affected the "this month"
 * and "this year" windows where `upperBound > now`.
 *
 * @module app/api/analyze/route
 */

import { NextRequest, NextResponse } from "next/server";
import pool from "@/utility/db/postgres";
import { getCurrentUserId } from "@/utility/auth/methods";
import { sanitizeInteger } from "@/utility/validation";
import {
  getCutoffTimestamp,
  getUpperBoundTimestamp,
  jalaliToTimestamp,
  toJalaliDateArray,
  toTehranDayStart,
  NO_UPPER_BOUND,
} from "@/utility/shared/timeMethods";
import { DEFAULT_TIME_WINDOW } from "@/app/transactions/methods";
import { TransactionCategories } from "@/utility/shared/transactionCategories";
import {
  calculateWaterfallData,
  extendWaterfallWithForecast,
  type WaterfallData,
} from "@/utility/shared/waterfallMethods";
import { getTotalBalanceHistory } from "@/utility/shared/balancesMethods";
import {
  forecastSeries,
  FORECAST_METHOD_VALUES,
  type ForecastMethod,
} from "@/utility/shared/forecastMethods";
import type { TransactionType } from "@/utility/shared/transactionTypes";

/** Sentinel value meaning "no time restriction" (≈ 100 years). */
const ALL_TIME = 36500;

/** Milliseconds in one day — used for the end-of-today cutoff. */
const DAY_MS = 24 * 60 * 60 * 1000;

/** Synthetic category id used for transactions whose category is missing. */
const UNCATEGORIZED_ID = -1;

/** Minimum slice size (in %) for a category to appear in the donut chart. */
const MIN_PERCENT_FOR_CHART = 2;

/** Row shape returned by the main transactions query. */
type TxRow = {
  id: string;
  time: number;
  type: TransactionType["type"];
  debit: string;
  credit: string;
  value: number;
  tag: string | null;
  name: string;
};

/** A single slice in the income/expense donut chart. */
type ChartSlice = {
  id: number | "other";
  name: string;
  amount: number;
  percent: number;
};

/** Per-tag amount within a category. */
type TagBreakdown = { tagId: string; tagName: string; amount: number };

/** Per-category breakdown including its per-tag split. */
type CategoryBreakdown = {
  id: number;
  name: string;
  amount: number;
  tags: TagBreakdown[];
  untaggedAmount: number;
};

/** Group of categories sharing a parent heading (e.g. "خورد و خوراک"). */
type GroupBreakdown = {
  id: number;
  name: string;
  amount: number;
  categories: CategoryBreakdown[];
};

/**
 * A single point on the cumulative forecast chart.
 *
 * `cumulative` is the running total of `value` from the start of the
 * window through `time`, in Rials.
 */
type ForecastSeriesPoint = { time: number; cumulative: number };

/**
 * Complete forecast bundle for one side (income or expense).
 *
 * - `historical` — cumulative totals bucketed from the start of the
 *   selected window through "now".
 * - `byMethod` — four future series, one per supported forecasting
 *   method, each starting from the last historical bucket.
 * - `bucketSize` — granularity of both series, chosen automatically
 *   from the window's length so the chart stays readable.
 */
type ForecastBundle = {
  historical: ForecastSeriesPoint[];
  byMethod: Record<ForecastMethod, ForecastSeriesPoint[]>;
  bucketSize: "day" | "week" | "month";
};

/** Full breakdown payload for one side (income or expense). */
type BreakdownData = {
  totalAmount: number;
  chartSlices: ChartSlice[];
  details: GroupBreakdown[];
  forecast: ForecastBundle;
};

/**
 * Precomputed forecast totals for one side (income or expense) scoped
 * to the target window's forecast horizon.
 *
 * `projectedBalance` is the balance the user would have at the end of
 * the horizon if the selected method's predictions hold, i.e.
 * `balanceAtNow + profit`.
 */
type ProfitForecastEntry = {
  income: number;
  expense: number;
  profit: number;
  projectedBalance: number;
};

/** A transfer transaction involving at least one `Book` account. */
type BookTransfer = {
  debit: string;
  credit: string;
  value: number;
};

/* ────────────────────────────────────────────────────────────
 * Category metadata (name + parent group)
 * ──────────────────────────────────────────────────────────── */

/**
 * Builds a lookup from category id → `{ name, groupId, groupName }`
 * for every income/expense subcategory, plus a synthetic entry for
 * uncategorized transactions.
 *
 * @returns A map keyed by category id.
 */
function buildCategoryMeta() {
  const meta = new Map<
    number,
    { name: string; groupId: number; groupName: string }
  >();
  for (const group of [
    ...TransactionCategories.expense,
    ...TransactionCategories.income,
  ]) {
    for (const sub of group.sub) {
      meta.set(sub.id, {
        name: sub.name,
        groupId: group.id,
        groupName: group.name,
      });
    }
  }
  meta.set(UNCATEGORIZED_ID, {
    name: "دسته‌بندی‌نشده",
    groupId: 0,
    groupName: "سایر",
  });
  return meta;
}

/* ────────────────────────────────────────────────────────────
 * Breakdown (per-category, per-tag) for income or expense
 * ──────────────────────────────────────────────────────────── */

/**
 * Aggregates transactions into a two-level breakdown (groups → categories
 * → tags) and prepares the donut-chart slices.
 *
 * Only transactions within `[getCutoffTimestamp(timeParam),
 * getUpperBoundTimestamp(timeParam)]` are counted.
 *
 * The returned object is `BreakdownData` **minus** the `forecast` field,
 * which is attached later in the request handler by {@link computeForecast}.
 *
 * @param transactions - All non-transfer transactions for the user.
 * @param tagNames - Map of tag id → display name.
 * @param kind - Whether to aggregate income or expense.
 * @param timeParam - The selected time window (see module docs).
 * @returns The breakdown payload for this side, without the forecast.
 */
function computeBreakdown(
  transactions: TxRow[],
  tagNames: Map<string, string>,
  kind: "income" | "expense",
  timeParam: number,
): Omit<BreakdownData, "forecast"> {
  const conf =
    kind === "income"
      ? { txType: "debit" as const, catField: "credit" as const }
      : { txType: "credit" as const, catField: "debit" as const };

  const cutoff = timeParam === ALL_TIME ? 0 : getCutoffTimestamp(timeParam);
  const upperBound = getUpperBoundTimestamp(timeParam);
  const categoryMeta = buildCategoryMeta();

  const catMap = new Map<
    number,
    { total: number; byTag: Map<string, number>; untagged: number }
  >();
  let total = 0;

  for (const tx of transactions) {
    if (tx.time < cutoff) continue;
    if (tx.time > upperBound) continue;
    if (tx.type !== conf.txType) continue;
    total += tx.value;

    const rawCatId = Number(tx[conf.catField]);
    const catId = Number.isNaN(rawCatId) ? UNCATEGORIZED_ID : rawCatId;
    let entry = catMap.get(catId);
    if (!entry) {
      entry = { total: 0, byTag: new Map(), untagged: 0 };
      catMap.set(catId, entry);
    }
    entry.total += tx.value;
    if (tx.tag) {
      entry.byTag.set(tx.tag, (entry.byTag.get(tx.tag) || 0) + tx.value);
    } else {
      entry.untagged += tx.value;
    }
  }

  // Chart slices
  const slices: ChartSlice[] = [];
  if (total > 0) {
    const sorted = [...catMap.entries()]
      .filter(([, e]) => e.total > 0)
      .map(([id, e]) => ({
        id,
        name: categoryMeta.get(id)?.name ?? "نامشخص",
        amount: e.total,
      }))
      .sort((a, b) => b.amount - a.amount);

    let otherAmount = 0;
    for (const cat of sorted) {
      const pct = (cat.amount / total) * 100;
      if (pct >= MIN_PERCENT_FOR_CHART) {
        slices.push({
          id: cat.id,
          name: cat.name,
          amount: cat.amount,
          percent: cat.amount / total,
        });
      } else {
        otherAmount += cat.amount;
      }
    }
    if (otherAmount > 0) {
      slices.push({
        id: "other",
        name: kind === "income" ? "سایر درآمدها" : "سایر هزینه‌ها",
        amount: otherAmount,
        percent: otherAmount / total,
      });
    }
  }

  // Grouped details
  const groupMap = new Map<
    number,
    { name: string; amount: number; categories: CategoryBreakdown[] }
  >();

  for (const [catId, entry] of catMap) {
    if (entry.total <= 0) continue;
    const meta = categoryMeta.get(catId);
    if (!meta) continue;

    const hasAnyTag = entry.byTag.size > 0;
    const tagRows: TagBreakdown[] = hasAnyTag
      ? [...entry.byTag.entries()]
          .map(([tagId, amount]) => ({
            tagId,
            tagName: tagNames.get(tagId) || "برچسب ناشناخته",
            amount,
          }))
          .sort((a, b) => b.amount - a.amount)
      : [];

    const catRow: CategoryBreakdown = {
      id: catId,
      name: meta.name,
      amount: entry.total,
      tags: tagRows,
      untaggedAmount: hasAnyTag ? entry.untagged : 0,
    };

    let group = groupMap.get(meta.groupId);
    if (!group) {
      group = { name: meta.groupName, amount: 0, categories: [] };
      groupMap.set(meta.groupId, group);
    }
    group.amount += entry.total;
    group.categories.push(catRow);
  }

  const details: GroupBreakdown[] = [...groupMap.entries()]
    .map(([id, g]) => ({
      id,
      name: g.name,
      amount: g.amount,
      categories: g.categories.sort((a, b) => b.amount - a.amount),
    }))
    .sort((a, b) => b.amount - a.amount);

  return { totalAmount: total, chartSlices: slices, details };
}

/* ────────────────────────────────────────────────────────────
 * Cashflow (current window vs. previous equivalent window)
 * ──────────────────────────────────────────────────────────── */

/**
 * Computes income and expense for the current window and the equivalent
 * previous window, so the UI can show "vs. last period" deltas.
 *
 * For the two "current period" windows (`-1`, `-2`), `currentEnd` is set
 * to the end of that period (not to now) so future-dated transactions
 * inside the period are included.
 *
 * @param transactions - All non-transfer transactions for the user.
 * @param timeParam - The selected time window (see module docs).
 * @returns Current and previous income/expense figures.
 */
function computeCashflow(transactions: TxRow[], timeParam: number) {
  const now = Date.now();
  const [jYear, jMonth] = toJalaliDateArray(new Date(now));

  let currentCutoff = 0;
  let pastCutoff = 0;
  let pastEnd = 0;
  let needPast = timeParam !== ALL_TIME;

  // End of the current window. For the two "current period" windows the
  // window extends to the end of that period; otherwise it ends at "now".
  const currentEnd =
    timeParam === -1 || timeParam === -2
      ? getUpperBoundTimestamp(timeParam)
      : now;

  if (timeParam === ALL_TIME) {
    needPast = false;
  } else if (timeParam === -1) {
    currentCutoff = jalaliToTimestamp([jYear, jMonth, 1]);
    let prevMonth = jMonth - 1;
    let prevYear = jYear;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear -= 1;
    }
    pastCutoff = jalaliToTimestamp([prevYear, prevMonth, 1]);
    pastEnd = currentCutoff - 1;
  } else if (timeParam === -2) {
    currentCutoff = jalaliToTimestamp([jYear, 1, 1]);
    pastCutoff = jalaliToTimestamp([jYear - 1, 1, 1]);
    pastEnd = currentCutoff - 1;
  } else {
    currentCutoff = getCutoffTimestamp(timeParam);
    const duration = now - currentCutoff;
    pastCutoff = currentCutoff - duration;
    pastEnd = currentCutoff - 1;
  }

  let currentIncome = 0;
  let currentExpense = 0;
  let pastIncome = 0;
  let pastExpense = 0;

  for (const tx of transactions) {
    const t = tx.time;
    if (t >= currentCutoff && t <= currentEnd) {
      if (tx.type === "debit") currentIncome += tx.value;
      else if (tx.type === "credit") currentExpense += tx.value;
    } else if (needPast && t >= pastCutoff && t <= pastEnd) {
      if (tx.type === "debit") pastIncome += tx.value;
      else if (tx.type === "credit") pastExpense += tx.value;
    }
  }

  return {
    currentIncome,
    currentExpense,
    pastIncome,
    pastExpense,
    isAllTime: timeParam === ALL_TIME,
  };
}

/* ────────────────────────────────────────────────────────────
 * Profit (period metrics, uses full history for start/end balance)
 * ──────────────────────────────────────────────────────────── */

/**
 * Computes income, expense, net profit, start balance, end balance, and
 * balance-at-now for the selected time window.
 *
 * Income/expense only count transactions within
 * `[getCutoffTimestamp(timeParam), getUpperBoundTimestamp(timeParam)]`.
 * `startBalance` / `endBalance` are derived from the *full* balance
 * history but are clamped to the same window bounds, so `endBalance`
 * reflects the balance at the end of the selected window.
 *
 * `balanceAtNow` is the balance at the current instant (`Date.now()`),
 * used by the caller to compute `projectedBalance` without double-counting
 * the `[now, upperBound]` portion of the forecast horizon (relevant for
 * the "this month" / "this year" windows where `upperBound > now`).
 *
 * @param transactions - All non-transfer transactions for the user.
 * @param timeParam - The selected time window (see module docs).
 * @returns Profit metrics for the window, including `balanceAtNow`.
 */
function computeProfit(transactions: TxRow[], timeParam: number) {
  const cutoff = timeParam === ALL_TIME ? 0 : getCutoffTimestamp(timeParam);
  const upperBound = getUpperBoundTimestamp(timeParam);
  const now = Date.now();

  let income = 0;
  let expense = 0;
  for (const tx of transactions) {
    if (tx.time < cutoff) continue;
    if (tx.time > upperBound) continue;
    if (tx.type === "debit") income += tx.value;
    else if (tx.type === "credit") expense += tx.value;
  }

  const profit = income - expense;
  const totalHistory = getTotalBalanceHistory(
    transactions as unknown as TransactionType[],
  );

  let startBalance = 0;
  let endBalance = 0;
  let balanceAtNow = 0;

  if (totalHistory.length > 0) {
    if (cutoff === 0) {
      startBalance = 0;
    } else {
      for (let i = totalHistory.length - 1; i >= 0; i--) {
        if (totalHistory[i].time < cutoff) {
          startBalance = totalHistory[i].balance;
          break;
        }
      }
    }

    // Balance at the end of the selected window.
    for (let i = totalHistory.length - 1; i >= 0; i--) {
      if (totalHistory[i].time <= upperBound) {
        endBalance = totalHistory[i].balance;
        break;
      }
    }

    // Balance at "now" — the current instant. Used by the caller to
    // compute projectedBalance = balanceAtNow + forecastProfit without
    // double-counting the [now, upperBound] portion of the forecast
    // horizon (which is already reflected in endBalance for the
    // "this month" / "this year" windows).
    for (let i = totalHistory.length - 1; i >= 0; i--) {
      if (totalHistory[i].time <= now) {
        balanceAtNow = totalHistory[i].balance;
        break;
      }
    }
  }

  return {
    income,
    expense,
    profit,
    startBalance,
    endBalance,
    balanceAtNow,
    isAllTime: timeParam === ALL_TIME,
  };
}

/* ────────────────────────────────────────────────────────────
 * Forecast (historical series + per-method predictions)
 * ──────────────────────────────────────────────────────────── */

/**
 * Milliseconds in one day, aliased locally so the forecast helpers
 * don't reach into unrelated modules.
 */
const FORECAST_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Picks a bucket size for the forecast chart based on the longer of
 * the historical window and the forecast horizon.
 *
 * The goal is to keep the number of points on the chart bounded
 * regardless of how wide the user's window is:
 *
 * | Total span           | Bucket  |
 * |----------------------|---------|
 * | ≥ 2 years            | month   |
 * | ≥ 90 days            | week    |
 * | < 90 days            | day     |
 *
 * @param windowDays - Length of the historical window, in days.
 * @param forecastDays - Length of the forecast horizon, in days.
 * @returns The chosen bucket size in milliseconds.
 */
function pickBucketMs(windowDays: number, forecastDays: number): number {
  const span = Math.max(windowDays, forecastDays);
  if (span > 730) return 30 * FORECAST_DAY_MS;
  if (span > 90) return 7 * FORECAST_DAY_MS;
  return FORECAST_DAY_MS;
}

/**
 * Resolves the absolute end timestamp of the forecast horizon for a
 * given time-window selector.
 *
 * The horizon mirrors the semantics of the selected window:
 * - Any positive `N` (last N days) → now + (N + 1) days. The horizon is
 *   computed dynamically from `timeParam`, so newly added window sizes
 *   are handled correctly without code changes.
 * - `-1` (this month) → end of next Jalali month
 * - `-2` (this year) → end of current Jalali year
 * - `36500` (all time) → end of current Jalali year
 *
 * @param timeParam - The selected time window (see module docs).
 * @returns The Unix timestamp (ms) marking the end of the forecast.
 */
function getForecastEnd(timeParam: number): number {
  const now = Date.now();
  const [jy, jm] = toJalaliDateArray(new Date(now));

  // Any positive window: forecast horizon mirrors the window length.
  // We use (timeParam + 1) because the window selector uses 0-indexed
  // days (e.g. `6` = last 7 days, `29` = last 30 days).
  if (timeParam > 0) {
    return now + (timeParam + 1) * FORECAST_DAY_MS;
  }

  if (timeParam === -1) {
    // End of next Jalali month: start of the month after next, minus 1ms.
    let nextMonth = jm + 1;
    let nextYear = jy;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }
    let afterNextMonth = nextMonth + 1;
    let afterNextYear = nextYear;
    if (afterNextMonth > 12) {
      afterNextMonth = 1;
      afterNextYear += 1;
    }
    return jalaliToTimestamp([afterNextYear, afterNextMonth, 1]) - 1;
  }

  // -2 (this year) and 36500 (all time): end of the current Jalali year.
  return jalaliToTimestamp([jy + 1, 1, 1]) - 1;
}

/**
 * Rounds a timestamp down to the start of the bucket that contains it.
 *
 * Day buckets align to the start of the Tehran day (via
 * {@link toTehranDayStart}); week and month buckets align to epoch
 * multiples, which is fine for charting purposes.
 *
 * @param ts - The Unix timestamp (ms) to round.
 * @param bucketMs - Bucket size in milliseconds.
 * @returns The Unix timestamp (ms) of the bucket's start.
 */
function bucketOf(ts: number, bucketMs: number): number {
  if (bucketMs === FORECAST_DAY_MS) return toTehranDayStart(ts);
  return Math.floor(ts / bucketMs) * bucketMs;
}

/**
 * Builds the historical + forecast series for one side (income or
 * expense) over the selected window.
 *
 * The function performs three steps:
 * 1. **Bucket the historical deltas** — sums each transaction's value
 *    into the bucket it falls in, from the start of the window (or the
 *    user's first transaction, for "all time") through "now".
 * 2. **Densify** — emits one `{ time, cumulative }` point per bucket,
 *    so the chart's X axis is uniformly spaced even on quiet days.
 * 3. **Forecast** — for each supported method, calls
 *    {@link forecastSeries} to project the per-bucket delta forward,
 *    then converts those deltas back to a cumulative series.
 *
 * @param transactions - All non-transfer transactions for the user.
 * @param kind - Whether to forecast income or expense.
 * @param timeParam - The selected time window (see module docs).
 * @returns A {@link ForecastBundle} ready to be attached to the
 *          breakdown payload.
 */
function computeForecast(
  transactions: TxRow[],
  kind: "income" | "expense",
  timeParam: number,
): ForecastBundle {
  const now = Date.now();
  const cutoff = timeParam === ALL_TIME ? 0 : getCutoffTimestamp(timeParam);
  const txType = kind === "income" ? "debit" : "credit";

  // ─── Determine the effective start of the historical data ─────
  //
  // For most windows, this is simply `cutoff` (N days ago).
  // For "all time" (`cutoff === 0`), we must find the earliest
  // matching transaction *before* picking a bucket size. If we used
  // `cutoff = 0` (epoch) to compute `windowDays`, we'd get ~20000
  // days, which forces monthly buckets — even if the user only has
  // two weeks of data. With monthly buckets, two weeks of data
  // collapses to a single bucket, making the historical line
  // invisible on the chart.
  let effectiveStart = cutoff;
  if (cutoff === 0) {
    let earliest = now;
    for (const tx of transactions) {
      if (tx.type !== txType) continue;
      if (tx.time < earliest) earliest = tx.time;
    }
    effectiveStart = Math.min(earliest, now - FORECAST_DAY_MS);
  }

  // ─── Cap the forecast horizon for "all time" ──────────────────
  //
  // For "all time", the default forecast end is the end of the current
  // Jalali year. If the user has only a few weeks of data, that
  // 6-month forecast would dominate the chart, shrinking the
  // historical line to a few pixels. We cap the horizon to at most
  // 50% of the actual data span (with a 30-day minimum), so the
  // historical portion always occupies a reasonable share of the chart.
  let forecastEnd = getForecastEnd(timeParam);
  if (timeParam === ALL_TIME) {
    const dataSpan = now - effectiveStart;
    const maxForecastSpan = Math.max(30 * FORECAST_DAY_MS, dataSpan * 0.5);
    forecastEnd = Math.min(forecastEnd, now + maxForecastSpan);
  }

  // ─── Pick bucket size based on actual data span ───────────────
  const windowDays = Math.max(
    1,
    Math.ceil((now - effectiveStart) / FORECAST_DAY_MS),
  );
  const forecastDays = Math.max(
    1,
    Math.ceil((forecastEnd - now) / FORECAST_DAY_MS),
  );
  const bucketMs = pickBucketMs(windowDays, forecastDays);
  const bucketSize: ForecastBundle["bucketSize"] =
    bucketMs === FORECAST_DAY_MS
      ? "day"
      : bucketMs === 7 * FORECAST_DAY_MS
        ? "week"
        : "month";

  // ── Step 1: bucket the historical deltas ──────────────────
  const bucketValues = new Map<number, number>();
  for (const tx of transactions) {
    if (tx.type !== txType) continue;
    if (tx.time < cutoff || tx.time > now) continue;
    const b = bucketOf(tx.time, bucketMs);
    bucketValues.set(b, (bucketValues.get(b) ?? 0) + tx.value);
  }

  // ── Step 2: densify the historical series ─────────────────
  const startBucket = bucketOf(effectiveStart, bucketMs);
  const endBucket = bucketOf(now, bucketMs);
  const historicalValues: number[] = [];
  const historical: ForecastSeriesPoint[] = [];
  let cumulative = 0;
  for (let b = startBucket; b <= endBucket; b += bucketMs) {
    const v = bucketValues.get(b) ?? 0;
    historicalValues.push(v);
    cumulative += v;
    historical.push({ time: b, cumulative });
  }

  // ── Step 3: forecast each method ──────────────────────────
  const forecastSteps = Math.max(1, Math.ceil((forecastEnd - now) / bucketMs));

  const byMethod = {} as Record<ForecastMethod, ForecastSeriesPoint[]>;
  for (const method of FORECAST_METHOD_VALUES) {
    const predictions = forecastSeries(historicalValues, method, forecastSteps);
    const series: ForecastSeriesPoint[] = [];
    let c = cumulative;
    const firstTime = endBucket + bucketMs;
    for (let i = 0; i < predictions.length; i++) {
      c += predictions[i];
      series.push({ time: firstTime + i * bucketMs, cumulative: c });
    }
    byMethod[method] = series;
  }

  return { historical, byMethod, bucketSize };
}

/**
 * Extracts the total predicted amount within the forecast horizon for
 * each method from a {@link ForecastBundle}.
 *
 * The forecast horizon is the interval between the last historical
 * bucket and the last forecast bucket. Because `byMethod[method]`
 * accumulates deltas starting from the same baseline as the historical
 * series, the total predicted amount is simply the difference between
 * the last forecast cumulative and the last historical cumulative.
 *
 * @param bundle - A bundle returned by {@link computeForecast}.
 * @returns One total per method, clamped to non-negative values.
 */
function extractForecastTotals(
  bundle: ForecastBundle,
): Record<ForecastMethod, number> {
  const baseCumulative = bundle.historical.at(-1)?.cumulative ?? 0;
  const out = {} as Record<ForecastMethod, number>;
  for (const method of FORECAST_METHOD_VALUES) {
    const series = bundle.byMethod[method];
    const finalCumulative = series.at(-1)?.cumulative ?? baseCumulative;
    out[method] = Math.max(0, finalCumulative - baseCumulative);
  }
  return out;
}

/* ────────────────────────────────────────────────────────────
 * Cash on hand (excludes Book accounts and future transactions)
 * ──────────────────────────────────────────────────────────── */

/**
 * Computes the user's current **liquid** money, i.e. the sum of balances
 * across all non-`Book` accounts as of the end of today.
 *
 * `Book` accounts (receivables, payables, funds-in-transit) represent
 * ledger entries rather than actual cash. Future-dated transactions are
 * also excluded, so this figure represents money available right now.
 *
 * Transfers involving a `Book` account are handled explicitly:
 * - paying off a debt (`credit` = real, `debit` = Book) reduces cash,
 * - collecting a receivable (`credit` = Book, `debit` = real) increases cash.
 *
 * Transfers between two real accounts, or between two `Book` accounts,
 * leave cash unchanged and are ignored.
 *
 * @param nonTransferTxs - Every non-transfer transaction (all time).
 * @param bookTransfers - Transfer transactions touching a `Book` account.
 * @param bookIds - Set of `Book` account ids belonging to the user.
 * @returns The current cash-on-hand figure.
 */
function computeCashOnHand(
  nonTransferTxs: TxRow[],
  bookTransfers: BookTransfer[],
  bookIds: Set<string>,
): number {
  const endOfTodayMs = toTehranDayStart(Date.now() + DAY_MS) - 1;
  let cash = 0;

  for (const tx of nonTransferTxs) {
    if (tx.time > endOfTodayMs) continue;

    const value = tx.value;
    const debit = tx.debit || "";
    const credit = tx.credit || "";

    if (tx.type === "debit" || tx.type === "initial") {
      if (debit && !bookIds.has(debit)) cash += value;
    } else if (tx.type === "credit") {
      if (credit && !bookIds.has(credit)) cash -= value;
    }
  }

  for (const tx of bookTransfers) {
    const value = tx.value;
    if (tx.credit && !bookIds.has(tx.credit)) cash -= value;
    if (tx.debit && !bookIds.has(tx.debit)) cash += value;
  }

  return cash;
}

/* ────────────────────────────────────────────────────────────
 * Handler
 * ──────────────────────────────────────────────────────────── */

/**
 * GET handler for `/api/analyze`.
 *
 * Query params:
 * - `time` (number): time window. Special values: `-1` (this month),
 *   `-2` (this year), `36500` (all time), any positive N (last N days).
 *
 * @param req - The incoming Next.js request.
 * @returns A JSON response with `cashflow`, `income`, `expense`, `profit`
 *          (including `cashOnHand`), `waterfall`, `waterfallForecast`,
 *          and `profitForecast` sections.
 */
export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const timeR = sanitizeInteger(
    url.searchParams.get("time") ?? "",
    -2,
    ALL_TIME,
  );
  const timeParam = timeR.valid ? timeR.value : DEFAULT_TIME_WINDOW;

  try {
    const [txRes, tagRes, bookRes] = await Promise.all([
      pool.query(
        `SELECT id, time, type, debit, credit, value, tag, name
           FROM transactions
          WHERE user_id = $1 AND type != 'transfer'
          ORDER BY time ASC`,
        [userId],
      ),
      pool.query(`SELECT id, name FROM tags WHERE user_id = $1`, [userId]),
      pool.query<{ id: string }>(
        `SELECT id FROM accounts WHERE user_id = $1 AND type = 'Book'`,
        [userId],
      ),
    ]);

    const transactions: TxRow[] = txRes.rows.map((row) => ({
      id: row.id as string,
      time: Number(row.time),
      type: row.type as TransactionType["type"],
      debit: (row.debit as string) || "",
      credit: (row.credit as string) || "",
      value: Number(row.value),
      tag: (row.tag as string) || null,
      name: (row.name as string) || "",
    }));

    const tagNames = new Map<string, string>();
    for (const row of tagRes.rows as { id: string; name: string }[]) {
      tagNames.set(row.id, row.name);
    }

    // ─── Fetch transfers that touch a Book account ─────────────
    const bookIds = new Set<string>(bookRes.rows.map((r) => r.id));
    let bookTransfers: BookTransfer[] = [];

    if (bookIds.size > 0) {
      const tRes = await pool.query(
        `SELECT debit, credit, value FROM transactions
          WHERE user_id = $1 AND type = 'transfer'
            AND (debit = ANY($2) OR credit = ANY($2))`,
        [userId, Array.from(bookIds)],
      );
      bookTransfers = tRes.rows.map((r) => ({
        debit: (r.debit as string) || "",
        credit: (r.credit as string) || "",
        value: Number(r.value),
      }));
    }

    const cashflow = computeCashflow(transactions, timeParam);

    const incomeBase = computeBreakdown(
      transactions,
      tagNames,
      "income",
      timeParam,
    );
    const expenseBase = computeBreakdown(
      transactions,
      tagNames,
      "expense",
      timeParam,
    );

    const income: BreakdownData = {
      ...incomeBase,
      forecast: computeForecast(transactions, "income", timeParam),
    };
    const expense: BreakdownData = {
      ...expenseBase,
      forecast: computeForecast(transactions, "expense", timeParam),
    };

    const profitBase = computeProfit(transactions, timeParam);
    const cashOnHand = computeCashOnHand(transactions, bookTransfers, bookIds);
    const profit = { ...profitBase, cashOnHand };

    const txList = transactions as unknown as TransactionType[];

    const waterfall = calculateWaterfallData(txList);
    const waterfallForecast: Record<ForecastMethod, WaterfallData> =
      {} as Record<ForecastMethod, WaterfallData>;
    for (const method of FORECAST_METHOD_VALUES) {
      waterfallForecast[method] = extendWaterfallWithForecast(txList, method);
    }

    // ─── Profit forecast scoped to the target window ──────────
    //
    // The waterfall chart shows every month of the year (with forecast
    // for the remaining months), but the summary block below it must
    // reflect the same forecast horizon as the income/expense tabs.
    // We therefore extract per-method totals from the income and
    // expense forecast bundles and combine them into a single
    // per-method entry.
    //
    // `projectedBalance` is computed as `balanceAtNow + forecastProfit`
    // (NOT `endBalance + forecastProfit`) to avoid double-counting the
    // [now, upperBound] portion of the forecast horizon. For the "this
    // month" / "this year" windows, `endBalance` already includes
    // transactions in [now, upperBound], so adding the full forecast
    // profit (which also covers [now, upperBound]) would count that
    // interval twice. `balanceAtNow` is the balance at the current
    // instant, which is the correct baseline for the forecast.
    const incomeTotals = extractForecastTotals(income.forecast);
    const expenseTotals = extractForecastTotals(expense.forecast);

    const profitForecast = {} as Record<ForecastMethod, ProfitForecastEntry>;
    for (const method of FORECAST_METHOD_VALUES) {
      const forecastIncome = incomeTotals[method];
      const forecastExpense = expenseTotals[method];
      const forecastProfit = forecastIncome - forecastExpense;
      profitForecast[method] = {
        income: forecastIncome,
        expense: forecastExpense,
        profit: forecastProfit,
        projectedBalance: profit.balanceAtNow + forecastProfit,
      };
    }

    return NextResponse.json({
      cashflow,
      income,
      expense,
      profit,
      waterfall,
      waterfallForecast,
      profitForecast,
    });
  } catch (error) {
    console.error("GET /api/analyze error:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
