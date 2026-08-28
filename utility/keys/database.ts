export const DatabaseStores = {
  accountsStore: "accounts",
  transactionsStore: "transactions",
  tagsStore: "tags",
} as const;

export type DatabaseStoreType =
  (typeof DatabaseStores)[keyof typeof DatabaseStores];

/** Whitelist of stores accessible through this route. */
export const ALLOWED_STORES = ["accounts", "transactions", "tags"] as const;
