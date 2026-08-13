import { NextRequest, NextResponse } from "next/server";
import pool from "@/utility/db/postgres";
import { getCurrentUserId } from "@/utility/auth/methods";
import { sanitizeUuid } from "@/utility/validation";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/accounts/:id/ledger?time=29
 *
 * Returns transactions for the specified account with running balance info.
 * - Each transaction includes `balanceAfter` (balance immediately after that tx).
 * - Response includes `balanceBefore` (balance at the start of the filtered period).
 *
 * Balance calculation is done entirely in PostgreSQL using a window function.
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
  const timeWindow = Number(url.searchParams.get("time") || 29);

  // 36500 means "no time limit"
  let timeFilter = 0;
  if (timeWindow && timeWindow !== 36500) {
    timeFilter = Date.now() - timeWindow * 24 * 60 * 60 * 1000;
  }

  try {
    // 1) Calculate balanceBefore: sum of all tx effects before the filter period
    let balanceBefore = 0;
    if (timeFilter > 0) {
      const beforeRes = await pool.query(
        `SELECT COALESCE(SUM(
          CASE
            WHEN debit = $2 THEN value
            WHEN credit = $2 THEN -value
            ELSE 0
          END
        ), 0)::bigint AS balance_before
        FROM transactions
        WHERE user_id = $1 AND (debit = $2 OR credit = $2) AND time < $3`,
        [userId, accountId, timeFilter],
      );
      balanceBefore = Number(beforeRes.rows[0].balance_before) || 0;
    }

    // 2) Get transactions with running balance (window function over ALL txs, then filter)
    let query: string;
    const queryParams: unknown[] = [userId, accountId];

    if (timeFilter > 0) {
      query = `
        WITH all_txs AS (
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
          WHERE user_id = $1 AND (debit = $2 OR credit = $2)
        )
        SELECT * FROM all_txs
        WHERE time >= $3
        ORDER BY time DESC, id DESC`;
      queryParams.push(timeFilter);
    } else {
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
        WHERE user_id = $1 AND (debit = $2 OR credit = $2)
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
      balanceAfter: Number(row.balance_after),
    }));

    return NextResponse.json({ balanceBefore, transactions });
  } catch (error) {
    console.error(`GET /api/accounts/${accountId}/ledger error:`, error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
