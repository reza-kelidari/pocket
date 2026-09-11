import { NextResponse } from "next/server";
import pool from "@/utility/db/postgres";
import { getCurrentUserId } from "@/utility/auth/methods";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await pool.query(
      `SELECT
        a.id::text AS id,
        COALESCE(
          SUM(
            CASE
              WHEN t.debit = a.id::text AND t.credit = a.id::text THEN 0
              WHEN t.debit = a.id::text THEN t.value
              WHEN t.credit = a.id::text THEN -t.value
              ELSE 0
            END
          ),
          0
        ) AS last_balance
      FROM accounts a
      LEFT JOIN transactions t
        ON t.user_id = a.user_id
        AND (t.debit = a.id::text OR t.credit = a.id::text)
      WHERE a.user_id = $1
      GROUP BY a.id`,
      [userId],
    );

    const balances = res.rows.map((row: Record<string, unknown>) => ({
      id: String(row.id),
      history: [{ time: 0, balance: Number(row.last_balance) || 0 }],
    }));

    return NextResponse.json(balances);
  } catch (error) {
    console.error("GET /api/balances error:", error);
    const message =
      error instanceof Error ? error.message : "Unknown database error";
    return NextResponse.json(
      { error: "Database error", detail: message },
      { status: 500 },
    );
  }
}
