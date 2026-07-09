import { TransactionCategories } from "./transactionCategories";
import { TransactionType } from "../transactions/types";

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

export function getCategoryById(id: number) {
  for (const cat of TransactionCategories.expense) {
    if (cat.id === id) return cat;
    if (cat.sub) {
      const found = cat.sub.find((sub) => sub.id === id);
      if (found) return found;
    }
  }

  for (const cat of TransactionCategories.income) {
    if (cat.id === id) return cat;
    if (cat.sub) {
      const found = cat.sub.find((sub) => sub.id === id);
      if (found) return found;
    }
  }

  return null;
}
