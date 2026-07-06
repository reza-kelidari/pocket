import { TransactionCategories } from "./constant";

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
