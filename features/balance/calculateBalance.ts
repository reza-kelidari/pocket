import { TransactionType } from "../transactions/types";
import { BalanceType } from "./types";

export async function calculateAccountBalance(
  transactions: TransactionType[],
  accID: number,
) {
  const balances: BalanceType[] = [];

  let balance = 0;

  const sortedTransactions = [...transactions].sort(
    (a, b) => a.time - b.time,
  );

  sortedTransactions.forEach((transaction) => {
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