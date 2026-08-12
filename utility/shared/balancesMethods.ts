import { AccountType } from "../accounts/types";
import { TransactionType } from "../shared/transactionTypes";
import { AccountBalanceType, BalanceType } from "../balance/types";

/**
 * Calculates the daily balance history for a specific account.
 * Only days with transactions are stored to optimize memory and performance.
 */
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

/**
 * Calculates the daily total balance history across all accounts.
 * Only days with transactions are stored.
 */
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

export function getTotalBalances(balancePoints: AccountBalanceType[]): number {
  let balance = 0;
  balancePoints.forEach(
    (item) => (balance += item.history?.at(-1)?.balance ?? 0),
  );
  return balance;
}
