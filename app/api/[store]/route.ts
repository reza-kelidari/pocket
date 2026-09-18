import { NextRequest, NextResponse } from "next/server";
import pool from "@/utility/db/postgres";
import { getCurrentUserId } from "@/utility/auth/methods";
import {
  sanitizeUuid,
  sanitizeName,
  sanitizeNote,
  sanitizeEnum,
  sanitizeBoolean,
  sanitizeInteger,
  sanitizeTimestamp,
  sanitizeAmount,
  sanitizeIdOrCategory,
  type SanitizeResult,
} from "@/utility/validation";
import {
  ACCOUNT_TYPES,
  ACCOUNT_COLORS,
  TRANSACTION_TYPES,
  TAG_TYPES,
} from "@/utility/db/columns";
import { getCutoffTimestamp } from "@/utility/shared/timeMethods";
import { NUMERIC_FIELDS, castNumericFields } from "@/utility/db/castNumeric";
import { ALLOWED_STORES } from "@/utility/keys/database";

const STORE_QUERIES = {
  accounts: 'SELECT * FROM accounts WHERE user_id = $1 ORDER BY "order" ASC',
  transactions: "SELECT * FROM transactions WHERE user_id = $1",
  tags: 'SELECT * FROM tags WHERE user_id = $1 ORDER BY "order" ASC',
} as const;

function validateStore(rawStore: string): string | null {
  return (ALLOWED_STORES as readonly string[]).includes(rawStore)
    ? rawStore
    : null;
}

/* ─────────────────────────────────────────────────────────────
 * Field validators per store/column
 * ───────────────────────────────────────────────────────────── */

const NAMELESS_TRANSACTION_TYPES: ReadonlySet<string> = new Set(["transfer"]);

type FieldValidator = {
  sanitize: (value: unknown) => SanitizeResult<unknown>;

  required: boolean | ((item: Record<string, unknown>) => boolean);
  emptyValue?: unknown;
};

function resolveRequired(
  validator: FieldValidator,
  item: Record<string, unknown>,
): boolean {
  return typeof validator.required === "function"
    ? validator.required(item)
    : validator.required;
}

const STORE_VALIDATORS: Record<string, Record<string, FieldValidator>> = {
  accounts: {
    name: { sanitize: sanitizeName, required: true },
    type: {
      sanitize: (v) => sanitizeEnum(v, ACCOUNT_TYPES),
      required: true,
    },
    order: {
      sanitize: (v) => sanitizeInteger(v, 0, 99999),
      required: false,
      emptyValue: 0,
    },
    color: {
      sanitize: (v) => sanitizeEnum(v, ACCOUNT_COLORS),
      required: true,
    },
    default: {
      sanitize: sanitizeBoolean,
      required: false,
      emptyValue: false,
    },
    hidden: {
      sanitize: sanitizeBoolean,
      required: false,
      emptyValue: false,
    },
  },
  transactions: {
    time: { sanitize: sanitizeTimestamp, required: true },
    name: {
      sanitize: sanitizeName,
      required: (item) =>
        !NAMELESS_TRANSACTION_TYPES.has(String(item.type ?? "")),
      emptyValue: null,
    },
    type: {
      sanitize: (v) => sanitizeEnum(v, TRANSACTION_TYPES),
      required: true,
    },
    debit: {
      sanitize: sanitizeIdOrCategory,
      required: false,
      emptyValue: null,
    },
    credit: {
      sanitize: sanitizeIdOrCategory,
      required: false,
      emptyValue: null,
    },
    value: { sanitize: sanitizeAmount, required: true },
    note: {
      sanitize: sanitizeNote,
      required: false,
      emptyValue: null,
    },
    tag: {
      sanitize: sanitizeUuid,
      required: false,
      emptyValue: null,
    },
  },
  tags: {
    name: { sanitize: sanitizeName, required: true },
    type: {
      sanitize: (v) => sanitizeEnum(v, TAG_TYPES),
      required: true,
    },
    order: {
      sanitize: (v) => sanitizeInteger(v, 0, 99999),
      required: false,
      emptyValue: 0,
    },
  },
};

type ValidationOutcome =
  | { valid: true; value: Record<string, unknown> }
  | { valid: false; error: string };

function validateItem(
  store: string,
  item: Record<string, unknown>,
): ValidationOutcome {
  const validators = STORE_VALIDATORS[store];
  if (!validators) return { valid: false, error: "Invalid store" };

  const result: Record<string, unknown> = {};

  for (const [key, rawValue] of Object.entries(item)) {
    const validator = validators[key];
    if (!validator) continue;

    const isRequired = resolveRequired(validator, item);

    if (rawValue === null || rawValue === undefined || rawValue === "") {
      if (isRequired) {
        return { valid: false, error: `مقدار «${key}» اجباری است.` };
      }
      result[key] = validator.emptyValue ?? null;
      continue;
    }

    const sanitized = validator.sanitize(rawValue);
    if (!sanitized.valid) {
      if (!isRequired) {
        result[key] = validator.emptyValue ?? null;
        continue;
      }
      return {
        valid: false,
        error: `مقدار «${key}» نامعتبر است (${sanitized.reason}).`,
      };
    }
    result[key] = sanitized.value;
  }

  if (
    store === "transactions" &&
    NAMELESS_TRANSACTION_TYPES.has(String(item.type ?? "")) &&
    !("name" in result)
  ) {
    result.name = null;
  }

  return { valid: true, value: result };
}

/* ─────────────────────────────────────────────────────────────
 * GET
 * ───────────────────────────────────────────────────────────── */

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ store: string }> },
) {
  const userId = await getCurrentUserId();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { store: rawStore } = await params;
  const store = validateStore(rawStore);
  if (!store)
    return NextResponse.json({ error: "Invalid store" }, { status: 400 });

  const url = new URL(req.url);
  let query = STORE_QUERIES[store as keyof typeof STORE_QUERIES];
  const queryParams: unknown[] = [userId];
  let paramIndex = 2;

  if (store === "transactions") {
    const timeWindow = url.searchParams.get("time");
    const accounts = url.searchParams.get("accounts");
    const categories = url.searchParams.get("categories");
    const tags = url.searchParams.get("tags");

    if (timeWindow && timeWindow !== "36500") {
      const days = Number(timeWindow);
      if (!isNaN(days)) {
        const limitTime = getCutoffTimestamp(days);
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
        query += ` AND (
          (type = 'debit'  AND credit = ANY($${paramIndex}))
          OR (type = 'credit' AND debit  = ANY($${paramIndex}))
        )`;
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
  }

  try {
    const res = await pool.query(query, queryParams);
    const rows = res.rows.map((row: Record<string, unknown>) =>
      castNumericFields(row, store),
    );
    return NextResponse.json(rows);
  } catch (error) {
    console.error(`GET /api/${store} error:`, error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

/* ─────────────────────────────────────────────────────────────
 * POST
 * ───────────────────────────────────────────────────────────── */

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ store: string }> },
) {
  const userId = await getCurrentUserId();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { store: rawStore } = await params;
  const store = validateStore(rawStore);
  if (!store)
    return NextResponse.json({ error: "Invalid store" }, { status: 400 });

  try {
    const body = await req.json();
    if (body === null || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }
    const items = Array.isArray(body) ? body : [body];

    for (const item of items) {
      if (item === null || typeof item !== "object") {
        return NextResponse.json(
          { error: "Invalid item in request" },
          { status: 400 },
        );
      }
    }

    const validatedItems: Array<{
      id: string | null;
      data: Record<string, unknown>;
    }> = [];

    for (const item of items) {
      const {
        id: rawId,
        user_id: _ignoredUserId,
        ...data
      } = item as Record<string, unknown>;

      const idRes = sanitizeUuid(rawId);

      const outcome = validateItem(store, data);
      if (!outcome.valid) {
        return NextResponse.json({ error: outcome.error }, { status: 400 });
      }

      validatedItems.push({
        id: idRes.valid ? idRes.value : null,
        data: outcome.value,
      });
    }

    const client = await pool.connect();
    const resultIds: string[] = [];

    try {
      await client.query("BEGIN");

      for (const { id: safeId, data: safeData } of validatedItems) {
        if (store === "accounts") {
          delete safeData.create;
          delete safeData.initialBalance;
          delete safeData.createTimestamp;
        }

        const numericFields = NUMERIC_FIELDS[store] || [];
        for (const key of numericFields) {
          if (safeData[key] !== null && safeData[key] !== undefined) {
            safeData[key] = Number(safeData[key]);
          }
        }

        const keys = Object.keys(safeData);
        const values = Object.values(safeData);

        if (safeId) {
          const allKeys = ["id", "user_id", ...keys];
          const allValues = [safeId, userId, ...values];
          const cols = allKeys.map((k) => `"${k}"`).join(", ");
          const vals = allKeys.map((_, i) => `$${i + 1}`).join(", ");
          const updates = keys.map((k, i) => `"${k}" = $${i + 3}`).join(", ");

          if (keys.length === 0) {
            await client.query(
              `INSERT INTO ${store} (id, user_id) VALUES ($1, $2)
               ON CONFLICT (id) DO NOTHING`,
              allValues,
            );
            resultIds.push(safeId);
          } else {
            const query = `INSERT INTO ${store} (${cols}) VALUES (${vals})
                           ON CONFLICT (id) DO UPDATE SET ${updates}
                           WHERE ${store}.user_id = $2`;
            const result = await client.query(query, allValues);

            if (result.rowCount === 0) {
              await client.query("ROLLBACK");
              return NextResponse.json(
                { error: "Record is owned by another user" },
                { status: 409 },
              );
            }
            resultIds.push(safeId);
          }
        } else {
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

/* ─────────────────────────────────────────────────────────────
 * DELETE
 * ───────────────────────────────────────────────────────────── */

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ store: string }> },
) {
  const userId = await getCurrentUserId();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { store: rawStore } = await params;
  const store = validateStore(rawStore);
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
