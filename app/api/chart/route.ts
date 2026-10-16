/**
 * @fileoverview Balance Chart API Route
 *
 * Returns a time-series of balance points for a chart, plus summary values.
 *
 * Query params:
 * - `accountId` (optional, UUID): when present, the chart reflects only that
 *   account's balance. When absent, the chart reflects the total balance
 *   across all non-`Book` accounts.
 * - `time` (number): time window in days. Special values:
 *   - `-1` = this Jalali month
 *   - `-2` = this Jalali year
 *   - `36500` = all time
 *   - any positive number = last N days
 * - `tag` (optional, UUID or `"untagged"`): when present, restricts the
 *   chart to transactions carrying that tag (or lacking any tag).
 *
 * Response shape:
 * ```
 * {
 *   points:            ChartPoint[],  // one entry per Tehran day in the window
 *   currentBalance:    number,        // balance at the last point
 *   allTimeSpanDays:   number,        // days since first transaction
 *   cashOnHand:        number | null  // "available cash" (see below)
 * }
 * ```
 *
 * `cashOnHand` is only computed when no `accountId` and no `tag` filter are
 * applied (i.e. the "total balance" view). It excludes all `Book` accounts
 * (طلب‌ها / بدهی‌ها / وجوه در راه) so it represents liquid money the user
 * actually has available, as opposed to net worth including receivables and
 * payables.
 *
 * @module app/api/chart/route
 */

import { NextRequest, NextResponse } from "next/server";
import pool from "@/utility/db/postgres";
import { getCurrentUserId } from "@/utility/auth/methods";
import { sanitizeUuid, sanitizeInteger } from "@/utility/validation";
import {
  toTehranDayStart,
  getCutoffTimestamp,
} from "@/utility/shared/timeMethods";

/** Milliseconds in one day. Used to iterate day-by-day when filling gaps. */
const DAY_MS = 24 * 60 * 60 * 1000;

/** Sentinel value meaning "no time restriction" (≈ 100 years). */
const ALL_TIME = 36500;

/** Default window (in days) when the client omits the `time` param. */
const DEFAULT_WINDOW = 29;

/** A single point on the balance chart. */
type ChartPoint = { time: number; balance: number };

/**
 * GET handler for `/api/chart`.
 *
 * Builds a running balance series from the user's transactions, densified to
 * one point per Tehran calendar day within the requested window so the chart
 * renders a continuous line even on days without activity.
 *
 * When the request is for the "total balance" view (no `accountId`, no `tag`),
 * the response additionally includes `cashOnHand`, which is the sum of all
 * money held in non-`Book` accounts.
 *
 * @param req - The incoming Next.js request.
 * @returns A JSON response containing `points`, `currentBalance`,
 *          `allTimeSpanDays`, and optionally `cashOnHand`.
 */
export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const accountIdRaw = url.searchParams.get("accountId");
  const timeRaw = url.searchParams.get("time");
  const tagRaw = url.searchParams.get("tag");

  // ─── Validate optional accountId ─────────────────────────────
  let accountId: string | null = null;
  if (accountIdRaw && accountIdRaw !== "") {
    const r = sanitizeUuid(accountIdRaw);
    if (!r.valid) {
      return NextResponse.json({ error: "Invalid accountId" }, { status: 400 });
    }
    accountId = r.value;
  }

  // ─── Validate optional time window ───────────────────────────
  let time = DEFAULT_WINDOW;
  if (timeRaw) {
    const timeR = sanitizeInteger(timeRaw, -2, ALL_TIME);
    if (timeR.valid) time = timeR.value;
  }

  // ─── Parse tag filter ────────────────────────────────────────
  let tagValue: string | null = null;
  let isUntagged = false;
  if (tagRaw === "untagged") {
    isUntagged = true;
  } else if (tagRaw) {
    const r = sanitizeUuid(tagRaw);
    if (r.valid) tagValue = r.value;
  }

  try {
    // ─── Build the base query with optional filters ─────────────
    const params: unknown[] = [userId];
    const conditions: string[] = [];

    if (accountId) {
      params.push(accountId);
      const idx = params.length;
      conditions.push(`(debit = $${idx} OR credit = $${idx})`);
    }

    if (isUntagged) {
      conditions.push(`tag IS NULL`);
    } else if (tagValue) {
      params.push(tagValue);
      conditions.push(`tag = $${params.length}`);
    }

    const whereClause =
      conditions.length > 0 ? ` AND ${conditions.join(" AND ")}` : "";

    const query = `
      SELECT time, value, type, debit, credit
        FROM transactions
       WHERE user_id = $1${whereClause}
       ORDER BY time ASC`;

    const res = await pool.query(query, params);

    // ─── Aggregate into one balance point per Tehran day ────────
    const balanceByDay = new Map<number, number>();
    let runningBalance = 0;

    for (const row of res.rows) {
      const dayKey = toTehranDayStart(Number(row.time));
      const value = Number(row.value);

      if (accountId) {
        if (row.debit === accountId) runningBalance += value;
        else if (row.credit === accountId) runningBalance -= value;
      } else {
        if (row.type === "initial" || row.type === "debit")
          runningBalance += value;
        else if (row.type === "credit") runningBalance -= value;
      }
      balanceByDay.set(dayKey, runningBalance);
    }

    const fullHistory: ChartPoint[] = [...balanceByDay.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([t, balance]) => ({ time: t, balance }));

    const todayStart = toTehranDayStart(Date.now());
    const currentBalance =
      fullHistory.length > 0 ? fullHistory[fullHistory.length - 1].balance : 0;

    const allTimeSpanDays =
      fullHistory.length > 0
        ? Math.ceil((todayStart - fullHistory[0].time) / DAY_MS) + 1
        : 0;

    // ─── Densify the series to one point per day in the window ──
    let points: ChartPoint[];

    if (time === ALL_TIME || fullHistory.length === 0) {
      if (fullHistory.length === 0) {
        points = [{ time: todayStart, balance: 0 }];
      } else {
        points = [...fullHistory];
        const last = points[points.length - 1];
        if (last.time < todayStart) {
          points.push({ time: todayStart, balance: last.balance });
        }
      }
    } else {
      const cutoffDay = toTehranDayStart(getCutoffTimestamp(time));

      // Walk back to find the balance just before the window opens.
      let balanceBefore = 0;
      let idx = 0;
      while (idx < fullHistory.length && fullHistory[idx].time < cutoffDay) {
        balanceBefore = fullHistory[idx].balance;
        idx++;
      }

      // Fill one point per day from the cutoff through today.
      let current = balanceBefore;
      const filled: ChartPoint[] = [];
      for (let day = cutoffDay; day <= todayStart; day += DAY_MS) {
        while (idx < fullHistory.length && fullHistory[idx].time <= day) {
          current = fullHistory[idx].balance;
          idx++;
        }
        filled.push({ time: day, balance: current });
      }
      points = filled;
    }

    // ─── Compute cash-on-hand (only for the total-balance view) ─
    //
    // `Book` accounts are ledger containers (receivables / payables /
    // funds-in-transit) rather than real money. Excluding them yields the
    // amount of liquid cash the user actually has available right now.
    let cashOnHand: number | null = null;
    if (!accountId && !tagValue && !isUntagged) {
      const bookRes = await pool.query<{ id: string }>(
        `SELECT id FROM accounts WHERE user_id = $1 AND type = 'Book'`,
        [userId],
      );
      const bookIds = new Set<string>(bookRes.rows.map((r) => r.id));

      let cash = 0;
      for (const row of res.rows) {
        const value = Number(row.value);
        const type = row.type as string;
        const debit = (row.debit as string) || "";
        const credit = (row.credit as string) || "";

        if (type === "transfer") {
          // `credit` = source, `debit` = destination.
          if (credit && !bookIds.has(credit)) cash -= value;
          if (debit && !bookIds.has(debit)) cash += value;
        } else if (type === "debit" || type === "initial") {
          if (debit && !bookIds.has(debit)) cash += value;
        } else if (type === "credit") {
          if (credit && !bookIds.has(credit)) cash -= value;
        }
      }
      cashOnHand = cash;
    }

    return NextResponse.json({
      points,
      currentBalance,
      allTimeSpanDays,
      cashOnHand,
    });
  } catch (error) {
    console.error("GET /api/chart error:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
