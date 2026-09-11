import { TransactionCategories } from "./transactionCategories";
import { TransactionType } from "./transactionTypes";

const categoryById = (() => {
  const map = new Map<number, any>();

  for (const cat of TransactionCategories.expense) {
    map.set(cat.id, cat);
    for (const sub of cat.sub) {
      map.set(sub.id, sub);
    }
  }

  for (const cat of TransactionCategories.income) {
    map.set(cat.id, cat);
    for (const sub of cat.sub) {
      map.set(sub.id, sub);
    }
  }

  return map;
})();

export function getCategoryById(id: string | number) {
  return categoryById.get(Number(id)) ?? null;
}

export function getTransactionPrimaryAccountId(tx: TransactionType): string {
  return tx.type === "credit" ? tx.credit : tx.debit;
}
