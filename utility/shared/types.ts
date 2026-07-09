import { TransactionCategories } from "./transactionCategories";

/**
 * Top-level transaction category.
 *
 * Derived from the keys of {@link TransactionCategories}.
 */

export type TransactionCategoryGroupType = keyof typeof TransactionCategories;
/**
 * Transaction category within a top-level category.
 *
 * Derived from {@link TransactionCategories}.
 */

export type TransactionCategoryType = keyof (typeof TransactionCategories)[TransactionCategoryGroupType][number];
/**
 * Transaction subcategory.
 *
 * Derived from the available expense subcategories in
 * {@link TransactionCategories}.
 */

export type TransactionSubCategoryType = keyof (typeof TransactionCategories.expense)[number]["sub"][number];
