import { TransactionCategories } from "./transactionCategories";

export function getCategoryById(id: string) {
  for (const cat of TransactionCategories.expense) {
    if (cat.id === Number(id)) return cat;
    if (cat.sub) {
      const found = cat.sub.find((sub) => sub.id === Number(id));
      if (found) return found;
    }
  }

  for (const cat of TransactionCategories.income) {
    if (cat.id === Number(id)) return cat;
    if (cat.sub) {
      const found = cat.sub.find((sub) => sub.id === Number(id));
      if (found) return found;
    }
  }

  return null;
}
