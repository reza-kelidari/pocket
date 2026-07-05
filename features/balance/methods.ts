import { TransactionType } from "../transactions/types";
import { BalanceType } from "./types";

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
export function getAccountBalance(
  transactions: TransactionType[],
  accID: number,
) {
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

  return balances;
}
