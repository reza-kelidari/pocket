import { NextRequest, NextResponse } from "next/server";
import pool from "@/utility/db/postgres";
import { getCurrentUserId } from "@/utility/auth/methods";

const ALLOWED_STORES = ["accounts", "transactions", "tags"];

const NUMERIC_FIELDS: Record<string, string[]> = {
  accounts: ["order"],
  transactions: ["time", "value"],
  tags: ["order"],
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ store: string; id: string }> },
) {
  const userId = await getCurrentUserId();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { store: rawStore, id } = await params;
  const store = ALLOWED_STORES.includes(rawStore) ? rawStore : null;
  if (!store)
    return NextResponse.json({ error: "Invalid store" }, { status: 400 });

  try {
    const res = await pool.query(
      `SELECT * FROM ${store} WHERE id = $1 AND user_id = $2`,
      [id, userId],
    );
    const row = res.rows[0];
    if (row) {
      const fields = NUMERIC_FIELDS[store] || [];
      for (let k in row) {
        if (row[k] === null) {
          row[k] = fields.includes(k) ? 0 : "";
        } else if (fields.includes(k)) {
          row[k] = Number(row[k]);
        }
      }
    }
    return NextResponse.json(row || null);
  } catch (error) {
    console.error(`GET /api/${store}/${id} error:`, error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ store: string; id: string }> },
) {
  const userId = await getCurrentUserId();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { store: rawStore, id } = await params;
  const store = ALLOWED_STORES.includes(rawStore) ? rawStore : null;
  if (!store)
    return NextResponse.json({ error: "Invalid store" }, { status: 400 });

  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      if (store === "accounts") {
        await client.query(
          `DELETE FROM transactions WHERE user_id = $1 AND (debit = $2 OR credit = $2)`,
          [userId, id],
        );
      }

      if (store === "tags") {
        await client.query(
          `UPDATE transactions SET tag = NULL WHERE user_id = $1 AND tag = $2`,
          [userId, id],
        );
      }

      await client.query(
        `DELETE FROM ${store} WHERE id = $1 AND user_id = $2`,
        [id, userId],
      );

      await client.query("COMMIT");
      return NextResponse.json({ ok: true });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(`DELETE /api/${store}/${id} error:`, error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
