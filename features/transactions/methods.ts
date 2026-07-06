import { TransactionCategories } from "./constant";

export function getCategoryById(id: number) {
  console.log("id", id)
  for (const cat of TransactionCategories.expense) {
    if (cat.id === id) return cat;
    if (cat.sub) {
      const found = cat.sub.find((sub) => sub.id === id);
      console.log("found", found)
      console.log("sub", cat.sub)
      console.log("category", cat)
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
