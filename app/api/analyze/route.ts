import { NextRequest, NextResponse } from "next/server";
import pool from "@/utility/db/postgres";
import { getCurrentUserId } from "@/utility/auth/methods";
import { TransactionCategories } from "@/utility/shared/transactionCategories";
import { getCutoffTimestamp } from "@/utility/shared/timeMethods";

export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const timeWindow = Number(url.searchParams.get("time") || 30);
  const timeFilter = getCutoffTimestamp(timeWindow);

  try {
    let balanceBefore = 0;
    if (timeFilter > 0) {
      const beforeRes = await pool.query(
        `SELECT COALESCE(SUM(
          CASE 
            WHEN type = 'initial' THEN value 
            WHEN type = 'debit' THEN value 
            WHEN type = 'credit' THEN -value 
            ELSE 0 
          END
        ), 0)::bigint AS balance_before
        FROM transactions
        WHERE user_id = $1 AND time < $2`,
        [userId, timeFilter],
      );
      balanceBefore = Number(beforeRes.rows[0].balance_before) || 0;
    }

    let txQuery = `
      SELECT id, time, name, type, debit, credit, value, note, tag
      FROM transactions
      WHERE user_id = $1
    `;
    const params: any[] = [userId];

    if (timeFilter > 0) {
      txQuery += ` AND time >= $2`;
      params.push(timeFilter);
    }
    txQuery += ` ORDER BY time ASC`;

    const txRes = await pool.query(txQuery, params);
    const transactions = txRes.rows.map((row: any) => ({
      id: row.id,
      time: Number(row.time),
      name: row.name || "",
      type: row.type,
      debit: row.debit || "",
      credit: row.credit || "",
      value: Number(row.value),
      note: row.note || "",
      tag: row.tag || null,
    }));

    let incomeTotal = 0;
    let expenseTotal = 0;
    const incomeMap = new Map<number, number>();
    const expenseMap = new Map<number, number>();

    for (const tx of transactions) {
      if (tx.type === "debit") {
        incomeTotal += tx.value;
        const catId = Number(tx.credit);
        if (!isNaN(catId))
          incomeMap.set(catId, (incomeMap.get(catId) || 0) + tx.value);
      } else if (tx.type === "credit") {
        expenseTotal += tx.value;
        const catId = Number(tx.debit);
        if (!isNaN(catId))
          expenseMap.set(catId, (expenseMap.get(catId) || 0) + tx.value);
      }
    }

    const mapCategories = (map: Map<number, number>, isIncome: boolean) => {
      const result: { id: number; name: string; value: number }[] = [];
      const categories = isIncome
        ? TransactionCategories.income
        : TransactionCategories.expense;

      for (const [id, value] of map.entries()) {
        let name = "نامشخص";
        for (const group of categories) {
          if (group.id === id) {
            name = group.name;
            break;
          }
          const sub = group.sub.find((s) => s.id === id);
          if (sub) {
            name = `${group.name} - ${sub.name}`;
            break;
          }
        }
        result.push({ id, name, value });
      }
      return result.sort((a, b) => b.value - a.value);
    };

    return NextResponse.json({
      balanceBefore,
      transactions,
      incomes: {
        total: incomeTotal,
        byCategory: mapCategories(incomeMap, true),
      },
      expenses: {
        total: expenseTotal,
        byCategory: mapCategories(expenseMap, false),
      },
    });
  } catch (error) {
    console.error("GET /api/analyze error:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
