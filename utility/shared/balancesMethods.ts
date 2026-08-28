import { AccountType } from "../accounts/types";
import { TransactionType } from "../shared/transactionTypes";
import { AccountBalanceType, BalanceType } from "../balance/types";
import { getCutoffTimestamp } from "./timeMethods";

export type ChartWindow = 7 | 30 | 90 | "all" | -1 | -2;

export function getAccountBalanceHistory(
  transactions: TransactionType[],
  accountID: string,
): AccountBalanceType {
  const accTxs = transactions
    .filter((t) => t.debit === accountID || t.credit === accountID)
    .sort((a, b) => a.time - b.time);
  if (accTxs.length === 0) return { id: accountID, history: [] };
  const balanceByDay = new Map<number, number>();
  let balance = 0;
  for (const tx of accTxs) {
    const txDate = new Date(tx.time);
    txDate.setHours(0, 0, 0, 0);
    const dayTimestamp = txDate.getTime();
    if (tx.debit === accountID) balance += tx.value;
    else if (tx.credit === accountID) balance -= tx.value;
    balanceByDay.set(dayTimestamp, balance);
  }
  const history: BalanceType[] = Array.from(balanceByDay.entries()).map(
    ([time, balance]) => ({ time, balance }),
  );
  return { id: accountID, history };
}

export function getTotalBalanceHistory(
  transactions: TransactionType[],
): BalanceType[] {
  if (!transactions || transactions.length === 0) return [];
  const validTxs = transactions
    .filter((t) => ["initial", "debit", "credit"].includes(t.type))
    .sort((a, b) => a.time - b.time);
  if (validTxs.length === 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return [{ time: today.getTime(), balance: 0 }];
  }
  const balanceByDay = new Map<number, number>();
  let balance = 0;
  for (const tx of validTxs) {
    const txDate = new Date(tx.time);
    txDate.setHours(0, 0, 0, 0);
    const dayTimestamp = txDate.getTime();
    if (tx.type === "initial" || tx.type === "debit") {
      balance += tx.value;
    } else if (tx.type === "credit") {
      balance -= tx.value;
    }
    balanceByDay.set(dayTimestamp, balance);
  }
  return Array.from(balanceByDay.entries()).map(([time, balance]) => ({
    time,
    balance,
  }));
}

export function getAccountBalances(
  accounts: AccountType[],
  transactions: TransactionType[],
): AccountBalanceType[] {
  let balances: AccountBalanceType[] = [];
  accounts.forEach((account) => {
    const calculatedbalances = getAccountBalanceHistory(
      transactions.filter(
        (item) => item.debit === account.id || item.credit === account.id,
      ),
      account.id,
    );
    balances.push(calculatedbalances);
  });
  return balances;
}

export function sliceDailySeriesForWindow(
  history: BalanceType[],
  window: ChartWindow,
  now: number,
): BalanceType[] {
  if (window === "all" || history.length === 0) return history;

  let cutoff: number;

  if (window === -1 || window === -2) {
    cutoff = getCutoffTimestamp(window);
  } else {
    const daysAgo = window - 1;
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - daysAgo);
    startDate.setHours(0, 0, 0, 0);
    cutoff = startDate.getTime();
  }

  let firstPointBeforeWindow: BalanceType | null = null;
  const pointsInWindow: BalanceType[] = [];

  for (const point of history) {
    if (point.time < cutoff) {
      firstPointBeforeWindow = point;
    } else {
      pointsInWindow.push(point);
    }
  }

  if (firstPointBeforeWindow && pointsInWindow.length > 0) {
    return [firstPointBeforeWindow, ...pointsInWindow];
  }
  return pointsInWindow;
}

export function getAllTimeSpanDays(
  history: BalanceType[],
  now: number,
): number {
  if (history.length === 0) return 0;
  const firstDay = new Date(history[0].time);
  firstDay.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const diffTime = today.getTime() - firstDay.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}
