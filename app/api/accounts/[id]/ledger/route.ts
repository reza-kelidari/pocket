import { NextRequest, NextResponse } from "next/server";
import pool from "@/utility/db/postgres";
import { getCurrentUserId } from "@/utility/auth/methods";
import { sanitizeUuid } from "@/utility/validation";

type RouteParams = { params: Promise<{ id: string }> };

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
  const tagParam = url.searchParams.get("tag");

  let timeFilter = 0;
  if (timeWindow && timeWindow !== 36500) {
    timeFilter = Date.now() - timeWindow * 24 * 60 * 60 * 1000;
  }

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
      let beforeParams: unknown[] = [userId, accountId, timeFilter];

      if (isUntagged) {
        beforeQuery += ` AND tag IS NULL`;
      } else if (tagValue) {
        beforeQuery += ` AND tag = $4`;
        beforeParams.push(tagValue);
      }

      const beforeRes = await pool.query(beforeQuery, beforeParams);
      balanceBefore = Number(beforeRes.rows[0].balance_before) || 0;
    }

    let query: string;
    const queryParams: unknown[] = [userId, accountId];
    let paramIdx = 3;

    const tagFilterSQL = isUntagged
      ? `AND tag IS NULL`
      : tagValue
        ? `AND tag = $${paramIdx++}`
        : "";

    if (tagValue) queryParams.push(tagValue);

    if (timeFilter > 0) {
      queryParams.push(timeFilter);
      const timeIdx = queryParams.length;

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
          WHERE user_id = $1 AND (debit = $2 OR credit = $2) ${tagFilterSQL}
        )
        SELECT * FROM all_txs
        WHERE time >= $${timeIdx}
        ORDER BY time DESC, id DESC`;
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
      balanceAfter: Number(row.balance_after),
    }));

    return NextResponse.json({ balanceBefore, transactions });
  } catch (error) {
    console.error(`GET /api/accounts/${accountId}/ledger error:`, error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
