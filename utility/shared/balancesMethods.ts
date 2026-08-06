import { AccountType } from "../accounts/types";
import { TransactionType } from "../transactions/types";
import { AccountBalanceType, BalanceType } from "../balance/types";

/**
 * Calculates the daily balance history for a specific account.
 */
export function getAccountBalanceHistory(
  transactions: TransactionType[],
  accountID: string,
): AccountBalanceType {
  const accTxs = transactions
    .filter((t) => t.debit === accountID || t.credit === accountID)
    .sort((a, b) => a.time - b.time);

  if (accTxs.length === 0) return { id: accountID, history: [] };

  const balances: BalanceType[] = [];
  let balance = 0;

  // پیدا کردن روز اولین تراکنش
  const startDay = new Date(accTxs[0].time);
  startDay.setHours(0, 0, 0, 0);

  // روز امروز
  const endDay = new Date();
  endDay.setHours(0, 0, 0, 0);

  let currentDay = startDay.getTime();
  let txIndex = 0;

  // حلقه روز به روز تا رسیدن به امروز
  while (currentDay <= endDay.getTime()) {
    // اعمال تمام تراکنش‌هایی که در این روز (currentDay) رخ داده‌اند
    while (
      txIndex < accTxs.length &&
      new Date(accTxs[txIndex].time).setHours(0, 0, 0, 0) === currentDay
    ) {
      const tx = accTxs[txIndex];
      if (tx.debit === accountID) balance += tx.value;
      else if (tx.credit === accountID) balance -= tx.value;
      txIndex++;
    }

    // ثبت موجودی برای این روز
    balances.push({
      time: currentDay,
      balance,
    });

    // رفتن به روز بعد (۲۴ ساعت)
    currentDay += 24 * 60 * 60 * 1000;
  }

  return { id: accountID, history: balances };
}

/**
 * Calculates the daily total balance history across all accounts.
 */
export function getTotalBalanceHistory(
  transactions: TransactionType[],
): BalanceType[] {
  if (!transactions || transactions.length === 0) return [];

  // فیلتر کردن تراکنش‌هایی که روی موجودی کلی تاثیر دارند (transfer تاثیر روی کل ندارد)
  const validTxs = transactions
    .filter((t) => ["initial", "debit", "credit"].includes(t.type))
    .sort((a, b) => a.time - b.time);

  if (validTxs.length === 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return [{ time: today.getTime(), balance: 0 }];
  }

  const history: BalanceType[] = [];
  let balance = 0;

  const startDay = new Date(validTxs[0].time);
  startDay.setHours(0, 0, 0, 0);

  const endDay = new Date();
  endDay.setHours(0, 0, 0, 0);

  let currentDay = startDay.getTime();
  let txIndex = 0;

  while (currentDay <= endDay.getTime()) {
    while (
      txIndex < validTxs.length &&
      new Date(validTxs[txIndex].time).setHours(0, 0, 0, 0) === currentDay
    ) {
      const tx = validTxs[txIndex];
      if (tx.type === "initial" || tx.type === "debit") {
        balance += tx.value;
      } else if (tx.type === "credit") {
        balance -= tx.value;
      }
      txIndex++;
    }

    history.push({ time: currentDay, balance });
    currentDay += 24 * 60 * 60 * 1000;
  }

  return history;
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
