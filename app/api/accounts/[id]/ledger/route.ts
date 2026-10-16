/**
 * @fileoverview Account Ledger API Route
 *
 * Returns the running transaction ledger for a single account, scoped to
 * an optional time window and optional tag filter.
 *
 * Query params:
 * - `time` (number): time window. Special values:
 *   - `-1` = this Jalali month
 *   - `-2` = this Jalali year
 *   - `36500` = all time
 *   - any positive number = last N days
 * - `tag` (optional, UUID or `"untagged"`): when present, restricts the
 *   ledger to transactions carrying that tag (or lacking any tag).
 *
 * Response shape:
 * ```
 * {
 *   balanceBefore: number,           // running balance just before the window
 *   transactions: LedgerTransaction[] // newest first, with `balanceAfter`
 * }
 * ```
 *
 * ### Window-end behavior
 *
 * For the two "current period" windows (`-1` this month, `-2` this year),
 * the ledger includes all transactions up to the **end** of that period —
 * not to "now" — so future-dated transactions inside the period appear in
 * the ledger, consistent with the chart and analyze screens. Other windows
 * extend to "now", matching their "N days ago" semantics.
 *
 * @module app/api/accounts/[id]/ledger/route
 */

import { NextRequest, NextResponse } from "next/server";
import pool from "@/utility/db/postgres";
import { getCurrentUserId } from "@/utility/auth/methods";
import { sanitizeUuid } from "@/utility/validation";
import {
  getCutoffTimestamp,
  getUpperBoundTimestamp,
  NO_UPPER_BOUND,
} from "@/utility/shared/timeMethods";
import { DEFAULT_TIME_WINDOW } from "@/app/transactions/methods";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET handler for `/api/accounts/[id]/ledger`.
 *
 * @param req - The incoming Next.js request.
 * @param ctx - Route params containing the account id.
 * @returns A JSON response with `balanceBefore` and the list of
 *          transactions, each augmented with `balanceAfter`.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: rawId } = await params;
  const idResult = sanitizeUuid(rawId);
  if (!idResult.valid) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const accountId = idResult.value;

  const url = new URL(req.url);
  const timeWindow = Number(
    url.searchParams.get("time") || DEFAULT_TIME_WINDOW,
  );
  const tagParam = url.searchParams.get("tag");

  // ─── Resolve window bounds ──────────────────────────────────
  // For "this month" and "this year", the window extends to the end of
  // the period; every other window ends at "now" (upperBound = NO_UPPER_BOUND).
  const timeFilter = getCutoffTimestamp(timeWindow);
  const upperBound = getUpperBoundTimestamp(timeWindow);
  const hasUpperBound = upperBound !== NO_UPPER_BOUND;

  // ─── Parse tag filter ───────────────────────────────────────
  let tagValue: string | null = null;
  let isUntagged = false;
  if (tagParam === "untagged") {
    isUntagged = true;
  } else if (tagParam) {
    const tagIdResult = sanitizeUuid(tagParam);
    if (tagIdResult.valid) {
      tagValue = tagIdResult.value;
    }
  }

  try {
    // ─── Balance before the window ─────────────────────────────
    let balanceBefore = 0;
    if (timeFilter > 0) {
      let beforeQuery = `SELECT COALESCE(SUM(
          CASE 
            WHEN debit = $2 THEN value 
            WHEN credit = $2 THEN -value 
            ELSE 0 
          END
        ), 0)::bigint AS balance_before
        FROM transactions
        WHERE user_id = $1 AND (debit = $2 OR credit = $2) AND time < $3`;
      const beforeParams: unknown[] = [userId, accountId, timeFilter];

      if (isUntagged) {
        beforeQuery += ` AND tag IS NULL`;
      } else if (tagValue) {
        beforeQuery += ` AND tag = $4`;
        beforeParams.push(tagValue);
      }

      const beforeRes = await pool.query(beforeQuery, beforeParams);
      balanceBefore = Number(beforeRes.rows[0].balance_before) || 0;
    }

    // ─── Build the main query ──────────────────────────────────
    const queryParams: unknown[] = [userId, accountId];

    let tagFilterSQL = "";
    if (isUntagged) {
      tagFilterSQL = `AND tag IS NULL`;
    } else if (tagValue) {
      queryParams.push(tagValue);
      tagFilterSQL = `AND tag = $${queryParams.length}`;
    }

    let query: string;
    if (timeFilter > 0) {
      queryParams.push(timeFilter);
      const lowerIdx = queryParams.length;

      // Upper bound is only applied for "this month" / "this year".
      let upperClause = "";
      if (hasUpperBound) {
        queryParams.push(upperBound);
        upperClause = `AND time <= $${queryParams.length}`;
      }

      query = `
        WITH windowed AS (
          SELECT 
            id, time, name, type, debit, credit, value, note, tag,
            SUM(
              CASE 
                WHEN debit = $2 THEN value 
                WHEN credit = $2 THEN -value 
                ELSE 0 
              END
            ) OVER (
              ORDER BY time ASC, id ASC 
              ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
            )::bigint AS delta
          FROM transactions
          WHERE user_id = $1 
            AND (debit = $2 OR credit = $2) 
            ${tagFilterSQL}
            AND time >= $${lowerIdx}
            ${upperClause}
        )
        SELECT 
          id, time, name, type, debit, credit, value, note, tag, delta
        FROM windowed
        ORDER BY time DESC, id DESC`;
    } else {
      // All-time: no lower bound, and no upper bound either.
      query = `
        SELECT 
          id, time, name, type, debit, credit, value, note, tag,
          SUM(
            CASE 
              WHEN debit = $2 THEN value 
              WHEN credit = $2 THEN -value 
              ELSE 0 
            END
          ) OVER (
            ORDER BY time ASC, id ASC 
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
          )::bigint AS balance_after
        FROM transactions
        WHERE user_id = $1 AND (debit = $2 OR credit = $2) ${tagFilterSQL}
        ORDER BY time DESC, id DESC`;
    }

    const res = await pool.query(query, queryParams);
    const transactions = res.rows.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      time: Number(row.time),
      name: (row.name as string) || "",
      type: row.type as string,
      debit: (row.debit as string) || "",
      credit: (row.credit as string) || "",
      value: Number(row.value),
      note: (row.note as string) || "",
      tag: (row.tag as string) || null,
      balanceAfter:
        timeFilter > 0
          ? Number(row.delta) + balanceBefore
          : Number(row.balance_after),
    }));

    return NextResponse.json({ balanceBefore, transactions });
  } catch (error) {
    console.error(`GET /api/accounts/${accountId}/ledger error:`, error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
