"use client";

import { useSyncExternalStore } from "react";
import { accountsStore } from "./accountsStore";

/**
 * React hook for subscribing to the global accounts store.
 *
 * This hook keeps the component synchronized with the latest accounts data.
 * Whenever the store is updated, the component automatically re-renders with
 * the new accounts collection.
 *
 * Internally, it uses React's `useSyncExternalStore` API to safely subscribe
 * to the external store.
 *
 * @returns The current collection of accounts.
 */
export default function useAccounts() {
  return useSyncExternalStore(
    accountsStore.subscribe,
    accountsStore.getAccounts,
    accountsStore.getAccounts,
  );
}
