/**
 * Database column whitelists for each store.
 *
 * These whitelists define which columns are allowed in INSERT and UPDATE
 * operations. Any column not in the whitelist is silently discarded
 * before the query is built.
 */

import { AccountTypes } from "../shared/accountsTypes";
import { AccountColors } from "../shared/colors";
import { TagTypes } from "../shared/tagTypes";
import { TransactionKinds } from "../shared/transactionTypes";

export const ACCOUNT_COLUMNS = [
  "name",
  "type",
  "order",
  "color",
  "default",
  "hidden",
] as const;

export const TRANSACTION_COLUMNS = [
  "time",
  "name",
  "type",
  "debit",
  "credit",
  "value",
  "note",
  "tag",
] as const;

export const TAG_COLUMNS = ["name", "type", "order"] as const;

export const STORE_COLUMNS: Record<string, readonly string[]> = {
  accounts: ACCOUNT_COLUMNS,
  transactions: TRANSACTION_COLUMNS,
  tags: TAG_COLUMNS,
} as const;

export const ACCOUNT_TYPES = Object.keys(AccountTypes);
export const ACCOUNT_COLORS = Object.keys(AccountColors);
export const TRANSACTION_TYPES = TransactionKinds;
export const TAG_TYPES = TagTypes;
