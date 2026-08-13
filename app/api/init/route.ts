import { NextRequest, NextResponse } from "next/server";
import pool from "@/utility/db/postgres";
import { getCurrentUserId } from "@/utility/auth/methods";
import { toJalaali, toGregorian } from "jalaali-js";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const res = await pool.query(
      "SELECT 1 FROM accounts WHERE user_id = $1 LIMIT 1",
      [userId],
    );
    if (res.rowCount && res.rowCount > 0) {
      return new NextResponse(null, { status: 200 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("GET /api/init error:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query("SELECT pg_advisory_xact_lock($1)", [userId]);

    const existingRes = await client.query(
      "SELECT 1 FROM accounts WHERE user_id = $1 LIMIT 1",
      [userId],
    );

    if (existingRes.rowCount && existingRes.rowCount > 0) {
      await client.query("COMMIT");
      return new NextResponse(null, { status: 200 });
    }

    const now = new Date();
    const { jy } = toJalaali(now);
    const { gy, gm, gd } = toGregorian(jy, 1, 1);
    const time = new Date(gy, gm - 1, gd).getTime();

    const accounts = [
      { order: 1, name: "طلب‌ها", color: "green2", hidden: false },
      { order: 2, name: "بدهی‌ها", color: "red", hidden: false },
      { order: 999, name: "وجوه در راه", color: "black", hidden: true },
      { order: 0, name: "کیف پول نقدی", color: "orange", hidden: false },
    ];

    const insertedAccounts: { id: string; name: string }[] = [];

    for (const acc of accounts) {
      const res = await client.query(
        `INSERT INTO accounts (id, user_id, name, type, "order", color, "default", hidden)
         VALUES (gen_random_uuid(), $1, $2, 'Wallet', $3, $4, true, $5)
         RETURNING id`,
        [userId, acc.name, acc.order, acc.color, acc.hidden],
      );
      insertedAccounts.push({ id: res.rows[0].id, name: acc.name });
    }

    for (const acc of insertedAccounts) {
      if (acc.name === "وجوه در راه") continue;

      await client.query(
        `INSERT INTO transactions (id, user_id, time, name, debit, credit, value, type, note)
         VALUES (gen_random_uuid(), $1, $2, 'موجودی اولیه', $3, NULL, 0, 'initial', '')`,
        [userId, time, acc.id],
      );
    }

    await client.query("COMMIT");
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("POST /api/init error:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  } finally {
    client.release();
  }
}
