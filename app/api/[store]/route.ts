import { NextRequest, NextResponse } from "next/server";
import pool from "@/utility/db/postgres";
import { getCurrentUserId } from "@/utility/auth/methods";

const ALLOWED_STORES = ["accounts", "transactions", "tags"];

const NUMERIC_FIELDS: Record<string, string[]> = {
  accounts: ["order"],
  transactions: ["time", "value"],
  tags: ["order"],
};

function castNumericFields(rows: any[], store: string) {
  const fields = NUMERIC_FIELDS[store] || [];
  return rows.map((r) => {
    for (let k in r) {
      if (r[k] === null) {
        r[k] = fields.includes(k) ? 0 : "";
      } else if (fields.includes(k)) {
        r[k] = Number(r[k]);
      }
    }
    return r;
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ store: string }> },
) {
  const userId = await getCurrentUserId();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { store: rawStore } = await params;
  const store = ALLOWED_STORES.includes(rawStore) ? rawStore : null;
  if (!store)
    return NextResponse.json({ error: "Invalid store" }, { status: 400 });

  try {
    const res = await pool.query(`SELECT * FROM ${store} WHERE user_id = $1`, [
      userId,
    ]);
    const rows = castNumericFields(res.rows, store);
    return NextResponse.json(rows);
  } catch (error) {
    console.error(`GET /api/${store} error:`, error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ store: string }> },
) {
  const userId = await getCurrentUserId();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { store: rawStore } = await params;
  const store = ALLOWED_STORES.includes(rawStore) ? rawStore : null;
  if (!store)
    return NextResponse.json({ error: "Invalid store" }, { status: 400 });

  try {
    const body = await req.json();
    const items = Array.isArray(body) ? body : [body];

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      for (const item of items) {
        const { id, user_id: _ignoredUserId, ...data } = item;
        if (!id) continue;

        if (store === "accounts") {
          delete data.create;
          delete data.initialBalance;
          delete data.createTimestamp;
        }

        // ✅ پاکسازی مقادیر نامعتبر بدون تبدیل 0 به null
        for (const key in data) {
          if (data[key] === "") {
            data[key] = null;
          } else if (
            typeof data[key] === "number" &&
            ["debit", "credit", "tag"].includes(key)
          ) {
            data[key] = String(data[key]);
          }
        }

        // ✅ اطمینان از عدد بودن فیلدهای زمان و مبلغ
        const fields = NUMERIC_FIELDS[store] || [];
        for (const key of fields) {
          if (data[key] !== null && data[key] !== undefined) {
            data[key] = Number(data[key]);
          }
        }

        const keys = Object.keys(data);
        const values = Object.values(data);
        const allKeys = ["id", "user_id", ...keys];
        const allValues = [id, userId, ...values];

        const cols = allKeys.map((k) => `"${k}"`).join(", ");
        const vals = allKeys.map((_, i) => `$${i + 1}`).join(", ");
        const updates = keys.map((k, i) => `"${k}" = $${i + 3}`).join(", ");

        const query =
          keys.length === 0
            ? `INSERT INTO ${store} (id, user_id) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`
            : `INSERT INTO ${store} (${cols}) VALUES (${vals}) ON CONFLICT (id) DO UPDATE SET ${updates}`;

        await client.query(query, allValues);
      }

      await client.query("COMMIT");
      return NextResponse.json({ ok: true });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(`POST /api/${store} error:`, error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ store: string }> },
) {
  const userId = await getCurrentUserId();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { store: rawStore } = await params;
  const store = ALLOWED_STORES.includes(rawStore) ? rawStore : null;
  if (!store)
    return NextResponse.json({ error: "Invalid store" }, { status: 400 });

  try {
    await pool.query(`DELETE FROM ${store} WHERE user_id = $1`, [userId]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(`DELETE /api/${store} error:`, error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
