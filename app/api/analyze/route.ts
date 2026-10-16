/**
 * @fileoverview Advanced Analytics API Route
 *
 * Computes aggregated financial metrics for the "analyze" screen over a
 * requested time window. Returns four independent sections:
 *
 * - **cashflow** — income vs. expense for the current window and the
 *   equivalent previous window, used by the Cash-Flow tab.
 * - **income** / **expense** — per-category, per-tag breakdowns of money
 *   received and paid, used by the Financial Analysis tab.
 * - **profit** — start balance, income, expense, net profit, end balance,
 *   and the current **cash-on-hand** figure (liquid money excluding
 *   `Book` accounts). Used by the Profit tab.
 * - **waterfall** — monthly cumulative profit/loss for the current Jalali
 *   year, used by the Profit tab's waterfall chart.
 *
 * ### Window-end behavior
 *
 * For the two "current period" windows (`-1` this month, `-2` this year),
 * the aggregation extends to the **end** of that period — not to today —
 * so future-dated transactions inside the period are counted. Other
 * windows end at "now", matching their "N days ago" semantics.
 *
 * ### `cashOnHand`
 *
 * Computed from the entire transaction history, ignoring future-dated
 * transactions and `Book` accounts (receivables / payables / funds-in-
 * transit). It represents the user's present liquid money.
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
import { calculateWaterfallData } from "@/utility/shared/waterfallMethods";
import { getTotalBalanceHistory } from "@/utility/shared/balancesMethods";
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

/** Full breakdown payload for one side (income or expense). */
type BreakdownData = {
  totalAmount: number;
  chartSlices: ChartSlice[];
  details: GroupBreakdown[];
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
 * @param transactions - All non-transfer transactions for the user.
 * @param tagNames - Map of tag id → display name.
 * @param kind - Whether to aggregate income or expense.
 * @param timeParam - The selected time window (see module docs).
 * @returns The breakdown payload for this side.
 */
function computeBreakdown(
  transactions: TxRow[],
  tagNames: Map<string, string>,
  kind: "income" | "expense",
  timeParam: number,
): BreakdownData {
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
        name: kind === "income" ? "سایر درآمد‌ها" : "سایر هزینه‌ها",
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
 * Computes income, expense, net profit, start balance, and end balance
 * for the selected time window.
 *
 * Income/expense only count transactions within
 * `[getCutoffTimestamp(timeParam), getUpperBoundTimestamp(timeParam)]`.
 * `startBalance` / `endBalance` are derived from the *full* balance
 * history but are clamped to the same window bounds, so `endBalance`
 * reflects the balance at the end of the selected window.
 *
 * @param transactions - All non-transfer transactions for the user.
 * @param timeParam - The selected time window (see module docs).
 * @returns Profit metrics for the window.
 */
function computeProfit(transactions: TxRow[], timeParam: number) {
  const cutoff = timeParam === ALL_TIME ? 0 : getCutoffTimestamp(timeParam);
  const upperBound = getUpperBoundTimestamp(timeParam);

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
  }

  return {
    income,
    expense,
    profit,
    startBalance,
    endBalance,
    isAllTime: timeParam === ALL_TIME,
  };
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
 *          (including `cashOnHand`), and `waterfall` sections.
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
    const income = computeBreakdown(
      transactions,
      tagNames,
      "income",
      timeParam,
    );
    const expense = computeBreakdown(
      transactions,
      tagNames,
      "expense",
      timeParam,
    );
    const profitBase = computeProfit(transactions, timeParam);
    const cashOnHand = computeCashOnHand(transactions, bookTransfers, bookIds);
    const profit = { ...profitBase, cashOnHand };
    const waterfall = calculateWaterfallData(
      transactions as unknown as TransactionType[],
    );

    return NextResponse.json({
      cashflow,
      income,
      expense,
      profit,
      waterfall,
    });
  } catch (error) {
    console.error("GET /api/analyze error:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
