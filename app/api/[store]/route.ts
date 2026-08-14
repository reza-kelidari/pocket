import { NextRequest, NextResponse } from "next/server";
import pool from "@/utility/db/postgres";
import { getCurrentUserId } from "@/utility/auth/methods";
import { sanitizeUuid } from "@/utility/validation";
import { STORE_COLUMNS } from "@/utility/db/columns";

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

  const url = new URL(req.url);
  let query = `SELECT * FROM ${store} WHERE user_id = $1`;
  const queryParams: any[] = [userId];
  let paramIndex = 2;

  if (store === "transactions") {
    const timeWindow = url.searchParams.get("time");
    const accounts = url.searchParams.get("accounts");
    const categories = url.searchParams.get("categories");
    const tags = url.searchParams.get("tags");

    if (timeWindow && timeWindow !== "36500") {
      const days = Number(timeWindow);
      if (!isNaN(days)) {
        const limitTime = Date.now() - days * 24 * 60 * 60 * 1000;
        query += ` AND time >= $${paramIndex}`;
        queryParams.push(limitTime);
        paramIndex++;
      }
    }
    if (accounts) {
      const accList = accounts
        .split(",")
        .map((id) => sanitizeUuid(id.trim()))
        .filter((res) => res.valid)
        .map((res) => res.value);
      if (accList.length > 0) {
        query += ` AND (debit = ANY($${paramIndex}) OR credit = ANY($${paramIndex}))`;
        queryParams.push(accList);
        paramIndex++;
      }
    }
    if (categories) {
      const catList = categories.split(",").filter((s) => s !== "");
      if (catList.length > 0) {
        query += ` AND (debit = ANY($${paramIndex}) OR credit = ANY($${paramIndex}))`;
        queryParams.push(catList);
        paramIndex++;
      }
    }
    if (tags) {
      const tagList = tags.split(",").filter((s) => s !== "");
      if (tagList.length > 0) {
        query += ` AND tag = ANY($${paramIndex})`;
        queryParams.push(tagList);
        paramIndex++;
      }
    }
    query += ` ORDER BY time DESC`;
  } else if (store === "accounts" || store === "tags") {
    query += ` ORDER BY "order" ASC`;
  }

  try {
    const res = await pool.query(query, queryParams);
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
    const allowedCols = STORE_COLUMNS[store] || [];
    /** آرایه‌ی id‌های نهایی به ترتیب آیتم‌های ورودی */
    const resultIds: string[] = [];

    try {
      await client.query("BEGIN");

      for (const item of items) {
        const { id, user_id: _ignoredUserId, ...data } = item;
        const idRes = sanitizeUuid(id);

        const safeData: Record<string, any> = {};
        for (const key of Object.keys(data)) {
          if (allowedCols.includes(key)) {
            safeData[key] = data[key];
          }
        }

        if (store === "accounts") {
          delete safeData.create;
          delete safeData.initialBalance;
          delete safeData.createTimestamp;
        }

        for (const key in safeData) {
          if (safeData[key] === "") {
            safeData[key] = null;
          } else if (
            typeof safeData[key] === "number" &&
            ["debit", "credit", "tag"].includes(key)
          ) {
            safeData[key] = String(safeData[key]);
          }
        }

        const fields = NUMERIC_FIELDS[store] || [];
        for (const key of fields) {
          if (safeData[key] !== null && safeData[key] !== undefined) {
            safeData[key] = Number(safeData[key]);
          }
        }

        const keys = Object.keys(safeData);
        const values = Object.values(safeData);

        if (idRes.valid) {
          // ─── آیتم با id مشخص: INSERT یا UPDATE ───
          const safeId = idRes.value;
          const allKeys = ["id", "user_id", ...keys];
          const allValues = [safeId, userId, ...values];
          const cols = allKeys.map((k) => `"${k}"`).join(", ");
          const vals = allKeys.map((_, i) => `$${i + 1}`).join(", ");
          const updates = keys.map((k, i) => `"${k}" = $${i + 3}`).join(", ");
          const query =
            keys.length === 0
              ? `INSERT INTO ${store} (id, user_id) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`
              : `INSERT INTO ${store} (${cols}) VALUES (${vals}) ON CONFLICT (id) DO UPDATE SET ${updates}`;
          await client.query(query, allValues);
          resultIds.push(safeId);
        } else {
          // ─── آیتم بدون id: دیتابیس UUID تولید می‌کند ───
          const allCols = ["id", "user_id", ...keys];
          const colStr = allCols.map((k) => `"${k}"`).join(", ");
          const paramPlaceholders = keys.map((_, i) => `$${i + 2}`);
          const valStr = ["gen_random_uuid()", "$1", ...paramPlaceholders].join(
            ", ",
          );
          const query = `INSERT INTO ${store} (${colStr}) VALUES (${valStr}) RETURNING id`;
          const res = await client.query(query, [userId, ...values]);
          resultIds.push(res.rows[0].id);
        }
      }

      await client.query("COMMIT");
      return NextResponse.json({ ok: true, ids: resultIds });
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
