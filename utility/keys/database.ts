export const DatabaseStores = {
  accountsStore: "accounts",
  transactionsStore: "transactions",
  tagsStore: "tags",
} as const;

export type DatabaseStoreType =
  (typeof DatabaseStores)[keyof typeof DatabaseStores];
