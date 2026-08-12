/**
 * @fileoverview API route for single-record operations on stores (accounts, transactions, tags).
 *
 * Provides:
 * - `GET /api/:store/:id`    — Fetch a single record by ID.
 * - `DELETE /api/:store/:id` — Delete a single record with cascading business logic.
 *
 * All operations are scoped to the authenticated user. Account deletion
 * follows specific business rules:
 * - Default (system) accounts cannot be deleted.
 * - Transfer transactions referencing the deleted account are reassigned
 *   to the hidden "Funds in Transit" (وجوه در راه) account.
 * - Non-transfer transactions (debit, credit, initial) are permanently deleted.
 */

import { NextRequest, NextResponse } from "next/server";
import type { PoolClient } from "pg";
import pool from "@/utility/db/postgres";
import { getCurrentUserId } from "@/utility/auth/methods";
import { sanitizeUuid } from "@/utility/validation";

/** Whitelist of stores accessible through this route. */
const ALLOWED_STORES = ["accounts", "transactions", "tags"] as const;

/** Columns that should be cast from string/numeric to JS number in responses. */
const NUMERIC_FIELDS: Record<string, string[]> = {
  accounts: ["order"],
  transactions: ["time", "value"],
  tags: ["order"],
};

/**
 * Route parameter shape for dynamic `[store]/[id]` segments.
 */
type RouteParams = { params: Promise<{ store: string; id: string }> };

/**
 * Casts numeric fields in a database row to JS numbers and normalizes
 * `NULL` values to `0` (for numeric fields) or `""` (for string fields).
 *
 * @param row - The raw database row to normalize (mutated in place).
 * @param store - The store name, used to determine which fields are numeric.
 */
function castNumericFields(row: Record<string, unknown>, store: string): void {
  const fields = NUMERIC_FIELDS[store] || [];
  for (const key of Object.keys(row)) {
    if (row[key] === null) {
      row[key] = fields.includes(key) ? 0 : "";
    } else if (fields.includes(key)) {
      row[key] = Number(row[key]);
    }
  }
}

/**
 * Resolves and validates common request parameters.
 *
 * @param rawStore - The raw store segment from the URL.
 * @param rawId - The raw ID segment from the URL.
 * @returns An object with validated `store` and `id`, or an error response.
 */
function resolveParams(
  rawStore: string,
  rawId: string,
):
  | { store: string; id: string; error: null }
  | { store: null; id: null; error: NextResponse } {
  const store = (ALLOWED_STORES as readonly string[]).includes(rawStore)
    ? rawStore
    : null;
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

/**
 * Handles deletion of an account with cascading transaction logic.
 *
 * Business rules:
 * 1. Default (system) accounts are immutable and cannot be deleted.
 * 2. Transfer transactions referencing the deleted account are reassigned
 *    to the user's hidden "Funds in Transit" account to preserve the
 *    double-entry accounting balance.
 * 3. All other transaction types (debit, credit, initial) referencing
 *    the deleted account are permanently removed.
 *
 * @param client - The active PostgreSQL client (within a transaction).
 * @param userId - The authenticated user's ID.
 * @param accountId - The UUID of the account to delete.
 * @returns `null` on success, or a `NextResponse` error if deletion is forbidden.
 */
async function handleAccountDeletion(
  client: PoolClient,
  userId: number,
  accountId: string,
): Promise<NextResponse | null> {
  // Guard: prevent deletion of system/default accounts
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

  // Resolve the hidden "Funds in Transit" account for transfer reassignment
  const transitRes = await client.query(
    `SELECT id FROM accounts
     WHERE user_id = $1 AND "default" = true AND hidden = true
     LIMIT 1`,
    [userId],
  );
  const transitId: string | null =
    transitRes.rows.length > 0 ? transitRes.rows[0].id : null;

  if (transitId) {
    // Reassign transfer transactions where the deleted account is the destination
    await client.query(
      `UPDATE transactions SET debit = $3
       WHERE user_id = $1 AND type = 'transfer' AND debit = $2`,
      [userId, accountId, transitId],
    );

    // Reassign transfer transactions where the deleted account is the source
    await client.query(
      `UPDATE transactions SET credit = $3
       WHERE user_id = $1 AND type = 'transfer' AND credit = $2`,
      [userId, accountId, transitId],
    );
  }

  // Remove all non-transfer transactions associated with the deleted account
  await client.query(
    `DELETE FROM transactions
     WHERE user_id = $1 AND type != 'transfer' AND (debit = $2 OR credit = $2)`,
    [userId, accountId],
  );

  return null;
}

/**
 * `GET /api/:store/:id`
 *
 * Fetches a single record from the specified store by its UUID.
 * The response is scoped to the authenticated user.
 *
 * @returns The record as JSON, or `null` if not found.
 */
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
      castNumericFields(row, store!);
    }

    return NextResponse.json(row || null);
  } catch (error) {
    console.error(`GET /api/${store}/${id} error:`, error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

/**
 * `DELETE /api/:store/:id`
 *
 * Deletes a single record from the specified store, applying cascading
 * business logic within a database transaction:
 *
 * - **accounts**: Reassigns transfers to "Funds in Transit", deletes
 *   non-transfer transactions, then removes the account.
 * - **tags**: Strips the tag reference from all transactions, then
 *   removes the tag.
 * - **transactions**: Deletes the transaction directly.
 *
 * All operations are atomic — any failure triggers a full rollback.
 */
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

      // Store-specific cascading logic
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

      // Final deletion of the target record
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
