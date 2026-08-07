import { NextRequest, NextResponse } from "next/server";
import pool from "@/utility/db/postgres";
import { getCurrentUserId } from "@/utility/auth/methods";

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

      const safeInt = (val: any) => {
        const n = parseInt(val, 10);
        return isNaN(n) ? null : n;
      };

      for (const acc of backupData.accounts || []) {
        await client.query(
          `INSERT INTO accounts (id, user_id, name, type, "order", color, "default", hidden)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            acc.id,
            userId,
            acc.name,
            acc.type,
            safeInt(acc.order),
            acc.color,
            acc.default || false,
            acc.hidden || false,
          ],
        );
      }

      for (const tag of backupData.tags || []) {
        await client.query(
          `INSERT INTO tags (id, user_id, name, type, "order")
           VALUES ($1, $2, $3, $4, $5)`,
          [tag.id, userId, tag.name, tag.type, safeInt(tag.order)],
        );
      }

      for (const tx of backupData.transactions || []) {
        const cleanCredit =
          tx.credit === 0 || !tx.credit ? null : String(tx.credit);
        const cleanDebit =
          tx.debit === 0 || !tx.debit ? null : String(tx.debit);
        const cleanTag = tx.tag === 0 || !tx.tag ? null : String(tx.tag);

        await client.query(
          `INSERT INTO transactions (id, user_id, time, name, type, debit, credit, value, note, tag)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            tx.id,
            userId,
            safeInt(tx.time),
            tx.name,
            tx.type,
            cleanDebit,
            cleanCredit,
            safeInt(tx.value),
            tx.note,
            cleanTag,
          ],
        );
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
    console.error("POST /api/restore error:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
