import { NextRequest, NextResponse } from "next/server";
import pool from "@/utility/db/postgres";
import { getCurrentUserId } from "@/utility/auth/methods";
import {
  sanitizeUuid,
  sanitizeName,
  sanitizeEnum,
  sanitizeBoolean,
  sanitizeInteger,
  sanitizeTimestamp,
  sanitizeAmount,
} from "@/utility/validation";
import { ACCOUNT_TYPES, ACCOUNT_COLORS } from "@/utility/db/columns";

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { account, initialTransaction } = body ?? {};

    const accIdR = sanitizeUuid(account?.id);
    if (!accIdR.valid)
      return NextResponse.json(
        { error: "Invalid account id" },
        { status: 400 },
      );

    const nameR = sanitizeName(account?.name);
    if (!nameR.valid)
      return NextResponse.json({ error: "Invalid name" }, { status: 400 });

    const typeR = sanitizeEnum(account?.type, ACCOUNT_TYPES);
    if (!typeR.valid)
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });

    const colorR = sanitizeEnum(account?.color, ACCOUNT_COLORS);
    if (!colorR.valid)
      return NextResponse.json({ error: "Invalid color" }, { status: 400 });

    const orderR = sanitizeInteger(account?.order, 0, 99999);
    const defR = sanitizeBoolean(account?.default);
    const hidR = sanitizeBoolean(account?.hidden);

    let txId: string | null = null;
    let txValue = 0;
    let txTime = Date.now();
    if (initialTransaction) {
      const txIdR = sanitizeUuid(initialTransaction.id);
      if (!txIdR.valid)
        return NextResponse.json(
          { error: "Invalid transaction id" },
          { status: 400 },
        );
      const valR = sanitizeAmount(initialTransaction.value);
      if (!valR.valid)
        return NextResponse.json(
          { error: "Invalid transaction value" },
          { status: 400 },
        );
      const timeR = sanitizeTimestamp(initialTransaction.time);
      if (!timeR.valid)
        return NextResponse.json(
          { error: "Invalid transaction time" },
          { status: 400 },
        );
      txId = txIdR.value;
      txValue = valR.value;
      txTime = timeR.value;
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      await client.query(
        `INSERT INTO accounts (id, user_id, name, type, "order", color, "default", hidden)
         VALUES ($1, $2, $3, $4::account_type, $5, $6::account_color, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           type = EXCLUDED.type,
           "order" = EXCLUDED."order",
           color = EXCLUDED.color,
           "default" = EXCLUDED."default",
           hidden = EXCLUDED.hidden
         WHERE accounts.user_id = $2`,
        [
          accIdR.value,
          userId,
          nameR.value,
          typeR.value,
          orderR.valid ? orderR.value : 0,
          colorR.value,
          defR.valid ? defR.value : false,
          hidR.valid ? hidR.value : false,
        ],
      );

      if (txId) {
        await client.query(
          `INSERT INTO transactions (id, user_id, time, name, debit, credit, value, type, note)
           VALUES ($1, $2, $3, 'موجودی اولیه', $4, NULL, $5, 'initial', '')
           ON CONFLICT (id) DO UPDATE SET
             time = EXCLUDED.time,
             value = EXCLUDED.value,
             debit = EXCLUDED.debit
           WHERE transactions.user_id = $2`,
          [txId, userId, txTime, accIdR.value, txValue],
        );
      }

      await client.query("COMMIT");
      return NextResponse.json({
        ok: true,
        accountId: accIdR.value,
        transactionId: txId,
      });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("POST /api/accounts/save error:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
