import { TransactionCategories } from "./constant";

export type TransactionType = {
  id: number;
  time: number
  name: string;
  debit: number;
  credit: number;
  value: number;
  type: "normal" | "transfer" | "initial";
};

export type TransactionCategoriesType = keyof typeof TransactionCategories;

export type TransactionCategoryType =
  keyof (typeof TransactionCategories)[TransactionCategoriesType][number];

export type TransactionSubCategoryType =
  keyof typeof TransactionCategories.expense[number]["sub"][number];
