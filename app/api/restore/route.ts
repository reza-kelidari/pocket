import { NextRequest, NextResponse } from "next/server";
import pool from "@/utility/db/postgres";
import { getCurrentUserId } from "@/utility/auth/methods";
import {
  ACCOUNT_TYPES,
  ACCOUNT_COLORS,
  TRANSACTION_TYPES,
  TAG_TYPES,
} from "@/utility/db/columns";
import {
  sanitizeName,
  sanitizeInteger,
  sanitizeUuid,
  sanitizeEnum,
  sanitizeBoolean,
  sanitizeTimestamp,
  sanitizeNote,
  sanitizeAmount,
  sanitizeIdOrCategory,
} from "@/utility/validation";

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const backupData = await req.json();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      await client.query(`DELETE FROM transactions WHERE user_id = $1`, [
        userId,
      ]);
      await client.query(`DELETE FROM tags WHERE user_id = $1`, [userId]);
      await client.query(`DELETE FROM accounts WHERE user_id = $1`, [userId]);

      for (const acc of backupData.accounts || []) {
        const idR = sanitizeUuid(acc.id);
        if (!idR.valid) continue;

        const nameR = sanitizeName(acc.name);
        if (!nameR.valid) continue;

        const typeR = sanitizeEnum(acc.type, ACCOUNT_TYPES);
        const colorR = sanitizeEnum(acc.color, ACCOUNT_COLORS);
        const orderR = sanitizeInteger(acc.order, 0, 99999);
        const defaultR = sanitizeBoolean(acc.default);
        const hiddenR = sanitizeBoolean(acc.hidden);

        await client.query(
          `INSERT INTO accounts (id, user_id, name, type, "order", color, "default", hidden)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             type = EXCLUDED.type,
             "order" = EXCLUDED."order",
             color = EXCLUDED.color,
             "default" = EXCLUDED."default",
             hidden = EXCLUDED.hidden
           WHERE accounts.user_id = $2`,
          [
            idR.value,
            userId,
            nameR.value,
            typeR.valid ? typeR.value : "Wallet",
            orderR.valid ? orderR.value : 0,
            colorR.valid ? colorR.value : "black",
            defaultR.valid ? defaultR.value : false,
            hiddenR.valid ? hiddenR.value : false,
          ],
        );
      }

      for (const tag of backupData.tags || []) {
        const idR = sanitizeUuid(tag.id);
        if (!idR.valid) continue;

        const nameR = sanitizeName(tag.name);
        if (!nameR.valid) continue;

        const typeR = sanitizeEnum(tag.type, TAG_TYPES);
        const orderR = sanitizeInteger(tag.order, 0, 99999);

        await client.query(
          `INSERT INTO tags (id, user_id, name, type, "order")
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             type = EXCLUDED.type,
             "order" = EXCLUDED."order"
           WHERE tags.user_id = $2`,
          [
            idR.value,
            userId,
            nameR.value,
            typeR.valid ? typeR.value : "Other",
            orderR.valid ? orderR.value : 0,
          ],
        );
      }

      for (const tx of backupData.transactions || []) {
        const idR = sanitizeUuid(tx.id);
        if (!idR.valid) continue;

        const typeR = sanitizeEnum(tx.type, TRANSACTION_TYPES);
        if (!typeR.valid) continue;

        const timeR = sanitizeTimestamp(tx.time);
        const valueR = sanitizeAmount(tx.value);
        const nameR = sanitizeName(tx.name);
        const noteR = sanitizeNote(tx.note);

        const debitR = sanitizeIdOrCategory(tx.debit);
        const creditR = sanitizeIdOrCategory(tx.credit);
        const tagR = sanitizeUuid(tx.tag);

        await client.query(
          `INSERT INTO transactions (id, user_id, time, name, type, debit, credit, value, note, tag)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (id) DO UPDATE SET
             time = EXCLUDED.time,
             name = EXCLUDED.name,
             type = EXCLUDED.type,
             debit = EXCLUDED.debit,
             credit = EXCLUDED.credit,
             value = EXCLUDED.value,
             note = EXCLUDED.note,
             tag = EXCLUDED.tag
           WHERE transactions.user_id = $2`,
          [
            idR.value,
            userId,
            timeR.valid ? timeR.value : 0,
            nameR.valid ? nameR.value : "",
            typeR.value,
            debitR.valid ? debitR.value : null,
            creditR.valid ? creditR.value : null,
            valueR.valid ? valueR.value : 0,
            noteR.valid ? noteR.value : "",
            tagR.valid ? tagR.value : null,
          ],
        );
      }

      await client.query("COMMIT");
      return NextResponse.json({ ok: true });
    } catch (error: any) {
      await client.query("ROLLBACK");
      console.error("POST /api/restore error:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("POST /api/restore outer error:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
