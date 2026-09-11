import { NextResponse } from "next/server";
import pool from "@/utility/db/postgres";
import { getCurrentUserId } from "@/utility/auth/methods";
import { sanitizeUuid } from "@/utility/validation";

type RouteParams = { params: Promise<{ id: string }> };

interface TagBalanceRow {
  tag_id: string;
  balance: string | number;
}

/**
 * Returns the net balance per tag for a Book account, computed server-side.
 *
 * The client no longer needs to download every transaction to build this
 * breakdown; the query does the aggregation in Postgres.
 */
export async function GET(_req: Request, { params }: RouteParams) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: rawId } = await params;
  const r = sanitizeUuid(rawId);
  if (!r.valid) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const accountId = r.value;

  try {
    const res = await pool.query<TagBalanceRow>(
      `SELECT
         COALESCE(tag, '__untagged__') AS tag_id,
         COALESCE(SUM(
           CASE WHEN debit = $2 THEN value ELSE -value END
         ), 0)::bigint AS balance
       FROM transactions
       WHERE user_id = $1 AND (debit = $2 OR credit = $2)
       GROUP BY COALESCE(tag, '__untagged__')`,
      [userId, accountId],
    );

    const tagIds = res.rows
      .map((row) => row.tag_id)
      .filter((id) => id !== "__untagged__");

    const nameById = new Map<string, string>();
    if (tagIds.length > 0) {
      const namesRes = await pool.query<{ id: string; name: string }>(
        `SELECT id, name FROM tags WHERE user_id = $1 AND id = ANY($2)`,
        [userId, tagIds],
      );
      for (const row of namesRes.rows) {
        nameById.set(row.id, row.name);
      }
    }

    const result = res.rows
      .map((row) => ({
        tagId: row.tag_id,
        tagName:
          row.tag_id === "__untagged__"
            ? "بدون برچسب"
            : nameById.get(row.tag_id) || "برچسب ناشناخته",
        balance: Number(row.balance),
      }))
      .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));

    return NextResponse.json(result);
  } catch (error) {
    console.error(`GET /api/accounts/${accountId}/tag-balances error:`, error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
