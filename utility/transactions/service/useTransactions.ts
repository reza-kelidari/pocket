"use client";

import { useSyncExternalStore } from "react";
import { transactionsStore } from "./transactionsStore";

/**
 * React hook for subscribing to the global transactions store.
 *
 * This hook keeps the component synchronized with the latest accounts transactions
 * data. Whenever the store is updated, the component automatically re-renders
 * with the new transactions collection.
 *
 * Internally, it uses React's `useSyncExternalStore` API to safely subscribe
 * to the external store.
 *
 * @returns The current collection of transactions.
 */
export default function useTransactions() {
  return useSyncExternalStore(
    transactionsStore.subscribe,
    transactionsStore.getTransactions,
    transactionsStore.getTransactions,
  );
}
