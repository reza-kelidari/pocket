import { NextRequest, NextResponse } from "next/server";
import type { PoolClient } from "pg";
import pool from "@/utility/db/postgres";
import { getCurrentUserId } from "@/utility/auth/methods";
import { sanitizeUuid } from "@/utility/validation";
import { castNumericFields } from "@/utility/db/castNumeric";
import { ALLOWED_STORES } from "@/utility/keys/database";

type RouteParams = { params: Promise<{ store: string; id: string }> };

function validateStore(rawStore: string): string | null {
  return (ALLOWED_STORES as readonly string[]).includes(rawStore)
    ? rawStore
    : null;
}

function resolveParams(
  rawStore: string,
  rawId: string,
):
  | { store: string; id: string; error: null }
  | { store: null; id: null; error: NextResponse } {
  const store = validateStore(rawStore);
  if (!store) {
    return {
      store: null,
      id: null,
      error: NextResponse.json({ error: "Invalid store" }, { status: 400 }),
    };
  }
  const idResult = sanitizeUuid(rawId);
  if (!idResult.valid) {
    return {
      store: null,
      id: null,
      error: NextResponse.json({ error: "Invalid id" }, { status: 400 }),
    };
  }
  return { store, id: idResult.value, error: null };
}

async function handleAccountDeletion(
  client: PoolClient,
  userId: number,
  accountId: string,
): Promise<NextResponse | null> {
  const accountCheck = await client.query(
    `SELECT "default" FROM accounts WHERE id = $1 AND user_id = $2`,
    [accountId, userId],
  );
  if (accountCheck.rows.length > 0 && accountCheck.rows[0].default === true) {
    await client.query("ROLLBACK");
    return NextResponse.json(
      { error: "Cannot delete default account" },
      { status: 400 },
    );
  }

  const transitRes = await client.query(
    `SELECT id FROM accounts
     WHERE user_id = $1 AND "default" = true AND hidden = true
     LIMIT 1`,
    [userId],
  );
  const transitId: string | null =
    transitRes.rows.length > 0 ? transitRes.rows[0].id : null;

  if (transitId) {
    await client.query(
      `UPDATE transactions SET debit = $3
       WHERE user_id = $1 AND type = 'transfer' AND debit = $2`,
      [userId, accountId, transitId],
    );
    await client.query(
      `UPDATE transactions SET credit = $3
       WHERE user_id = $1 AND type = 'transfer' AND credit = $2`,
      [userId, accountId, transitId],
    );
  }

  await client.query(
    `DELETE FROM transactions
     WHERE user_id = $1 AND type != 'transfer' AND (debit = $2 OR credit = $2)`,
    [userId, accountId],
  );

  return null;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { store: rawStore, id: rawId } = await params;
  const { store, id, error } = resolveParams(rawStore, rawId);
  if (error) return error;

  try {
    const res = await pool.query(
      `SELECT * FROM ${store} WHERE id = $1 AND user_id = $2`,
      [id, userId],
    );
    const row = res.rows[0] as Record<string, unknown> | undefined;
    if (row) {
      castNumericFields(row, store);
    }
    return NextResponse.json(row || null);
  } catch (error) {
    console.error(`GET /api/${store}/${id} error:`, error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { store: rawStore, id: rawId } = await params;
  const { store, id, error } = resolveParams(rawStore, rawId);
  if (error) return error;

  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      if (store === "accounts") {
        const accountError = await handleAccountDeletion(client, userId, id);
        if (accountError) return accountError;
      }

      if (store === "tags") {
        await client.query(
          `UPDATE transactions SET tag = NULL
           WHERE user_id = $1 AND tag = $2`,
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
