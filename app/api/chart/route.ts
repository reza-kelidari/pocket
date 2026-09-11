import { NextRequest, NextResponse } from "next/server";
import pool from "@/utility/db/postgres";
import { getCurrentUserId } from "@/utility/auth/methods";
import { sanitizeUuid, sanitizeInteger } from "@/utility/validation";
import {
  toTehranDayStart,
  getCutoffTimestamp,
} from "@/utility/shared/timeMethods";

const DAY_MS = 24 * 60 * 60 * 1000;
const ALL_TIME = 36500;
const DEFAULT_WINDOW = 29;

type ChartPoint = { time: number; balance: number };

export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const accountIdRaw = url.searchParams.get("accountId");
  const timeRaw = url.searchParams.get("time");

  let accountId: string | null = null;
  if (accountIdRaw && accountIdRaw !== "") {
    const r = sanitizeUuid(accountIdRaw);
    if (!r.valid) {
      return NextResponse.json({ error: "Invalid accountId" }, { status: 400 });
    }
    accountId = r.value;
  }

  let time = DEFAULT_WINDOW;
  if (timeRaw) {
    const timeR = sanitizeInteger(timeRaw, -2, ALL_TIME);
    if (timeR.valid) time = timeR.value;
  }

  try {
    const query = accountId
      ? `SELECT time, value, type, debit, credit
           FROM transactions
          WHERE user_id = $1 AND (debit = $2 OR credit = $2)
          ORDER BY time ASC`
      : `SELECT time, value, type, debit, credit
           FROM transactions
          WHERE user_id = $1
          ORDER BY time ASC`;

    const params: unknown[] = accountId ? [userId, accountId] : [userId];
    const res = await pool.query(query, params);

    const balanceByDay = new Map<number, number>();
    let runningBalance = 0;

    for (const row of res.rows) {
      const dayKey = toTehranDayStart(Number(row.time));
      const value = Number(row.value);

      if (accountId) {
        if (row.debit === accountId) runningBalance += value;
        else if (row.credit === accountId) runningBalance -= value;
      } else {
        if (row.type === "initial" || row.type === "debit")
          runningBalance += value;
        else if (row.type === "credit") runningBalance -= value;
      }
      balanceByDay.set(dayKey, runningBalance);
    }

    const fullHistory: ChartPoint[] = [...balanceByDay.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([t, balance]) => ({ time: t, balance }));

    const todayStart = toTehranDayStart(Date.now());
    const currentBalance =
      fullHistory.length > 0 ? fullHistory[fullHistory.length - 1].balance : 0;

    const allTimeSpanDays =
      fullHistory.length > 0
        ? Math.ceil((todayStart - fullHistory[0].time) / DAY_MS) + 1
        : 0;

    let points: ChartPoint[];

    if (time === ALL_TIME || fullHistory.length === 0) {
      if (fullHistory.length === 0) {
        points = [{ time: todayStart, balance: 0 }];
      } else {
        points = [...fullHistory];
        const last = points[points.length - 1];
        if (last.time < todayStart) {
          points.push({ time: todayStart, balance: last.balance });
        }
      }
    } else {
      const cutoffDay = toTehranDayStart(getCutoffTimestamp(time));

      let balanceBefore = 0;
      let idx = 0;
      while (idx < fullHistory.length && fullHistory[idx].time < cutoffDay) {
        balanceBefore = fullHistory[idx].balance;
        idx++;
      }

      let current = balanceBefore;
      const filled: ChartPoint[] = [];
      for (let day = cutoffDay; day <= todayStart; day += DAY_MS) {
        while (idx < fullHistory.length && fullHistory[idx].time <= day) {
          current = fullHistory[idx].balance;
          idx++;
        }
        filled.push({ time: day, balance: current });
      }
      points = filled;
    }

    return NextResponse.json({
      points,
      currentBalance,
      allTimeSpanDays,
    });
  } catch (error) {
    console.error("GET /api/chart error:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
