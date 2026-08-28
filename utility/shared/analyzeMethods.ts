import { getCutoffTimestamp } from "./timeMethods";
import { TransactionType } from "./transactionTypes";

export function useFinancialSummary(
  transactions: TransactionType[],
  timeParam: number,
) {
  const cutoff = getCutoffTimestamp(timeParam);
  let income = 0,
    expense = 0;
  for (const tx of transactions) {
    if (tx.time < cutoff) continue;
    if (tx.type === "debit") income += tx.value;
    else if (tx.type === "credit") expense += tx.value;
  }
  return { income, expense, profit: income - expense };
}
