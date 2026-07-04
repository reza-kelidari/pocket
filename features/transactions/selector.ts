import { TransactionType } from "./types";

export function getLatestTransaction(
  transactions: TransactionType[],
  limit: number,
): TransactionType[] {
  return [...transactions].sort((a, b) => b.time - a.time).slice(0, limit);
}
