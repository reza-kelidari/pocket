import { AccountType } from "../accounts/types";
import { TransactionType } from "../transactions/types";
import { AccountBalanceType, BalanceType } from "./types";

/**
 * Calculates the balance history for a specific account.
 *
 * Transactions are processed in chronological order. For each transaction:
 * - If the account is the debit account, the transaction value is added.
 * - If the account is the credit account, the transaction value is subtracted.
 *
 * After processing each transaction, a balance snapshot is recorded, allowing
 * the balance to be reconstructed at any point in time.
 *
 * @param transactions Collection of transactions to process.
 * @param accID Identifier of the account whose balance history should be calculated.
 *
 * @returns An array of balance snapshots sorted by transaction time.
 */
export function getAccountBalanceHistory(
  transactions: TransactionType[],
  accID: number,
): AccountBalanceType {
  /**
   * Balance snapshots generated while processing transactions.
   */
  const balances: BalanceType[] = [];

  /**
   * Running balance of the account.
   */
  let balance = 0;

  transactions.forEach((transaction) => {
    if (transaction.debit === accID) {
      balance += transaction.value;
    } else if (transaction.credit === accID) {
      balance -= transaction.value;
    }

    balances.push({
      time: transaction.time,
      balance,
    });
  });

  return {
    id: accID,
    history: balances,
  };
}

export function getTotalBalanceHistory(
  transactions: TransactionType[],
): BalanceType[] {
  if (!transactions?.length) return [];

  let balance: number = 0;
  let historyDate: number;
  let history: BalanceType[] = [];

  transactions.forEach((transaction, index) => {
    if (!["initial", "debit", "credit"].includes(transaction.type)) {
      return;
    }

    const txDateLocale = new Date(transaction.time).toLocaleDateString("fa-ir");

    if (!historyDate) historyDate = transaction.time;
    const historyDateLocale = new Date(historyDate).toLocaleDateString("fa-ir");

    if (historyDateLocale !== txDateLocale) {
      history.push({ time: historyDate, balance: balance });
    }

    ["initial", "debit"].includes(transaction.type)
      ? (balance += transaction.value)
      : (balance -= transaction.value);

    historyDate = transaction.time;

    if (index === transactions.length - 1)
      history.push({ time: historyDate, balance: balance });
  });

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
