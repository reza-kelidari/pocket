import { NextRequest, NextResponse } from "next/server";
import pool from "@/utility/db/postgres";
import { getCurrentUserId } from "@/utility/auth/methods";
import { toJalaali, toGregorian } from "jalaali-js";
import { generateUUId } from "@/utility/shared/idGenerationMethods";

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

  try {
    const now = new Date();
    const { jy } = toJalaali(now);
    const { gy, gm, gd } = toGregorian(jy, 1, 1);
    const time = new Date(gy, gm - 1, gd).getTime();

    const walletID = generateUUId();
    const claimsID = generateUUId();
    const debtsID = generateUUId();
    const transitID = generateUUId();

    const accounts = [
      {
        id: claimsID,
        order: 1,
        name: "طلب‌ها",
        color: "green2",
        hidden: false,
      },
      { id: debtsID, order: 2, name: "بدهی‌ها", color: "red", hidden: false },
      {
        id: transitID,
        order: 999,
        name: "وجوه در راه",
        color: "black",
        hidden: true,
      },
      {
        id: walletID,
        order: 0,
        name: "کیف پول نقدی",
        color: "orange",
        hidden: false,
      },
    ];

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      for (const acc of accounts) {
        await client.query(
          `INSERT INTO accounts (id, user_id, name, type, "order", color, "default", hidden)
           VALUES ($1, $2, $3, 'Wallet', $4, $5, true, $6)`,
          [acc.id, userId, acc.name, acc.order, acc.color, acc.hidden],
        );
      }

      for (const acc of accounts) {
        if (acc.id === transitID) continue;

        await client.query(
          `INSERT INTO transactions (id, user_id, time, name, debit, credit, value, type, note)
           VALUES ($1, $2, $3, 'موجودی اولیه', $4, NULL, 0, 'initial', '')`,
          [generateUUId(), userId, time, acc.id],
        );
      }

      await client.query("COMMIT");
      return new NextResponse(null, { status: 200 });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("POST /api/init error:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
