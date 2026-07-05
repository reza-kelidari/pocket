import { TransactionType } from "./types";

/**
 * Returns the most recent transactions.
 *
 * Transactions are sorted in descending order by their timestamp, ensuring
 * that the newest transactions appear first. The original array is not modified.
 *
 * @param transactions Collection of transactions to process.
 * @param limit Maximum number of transactions to return.
 *
 * @returns An array containing up to the specified number of most recent transactions.
 */
export function getLatestTransactions(
  transactions: TransactionType[],
  limit: number,
): TransactionType[] {
  return [...transactions].sort((a, b) => b.time - a.time).slice(0, limit);
}
