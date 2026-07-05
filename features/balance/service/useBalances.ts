"use client";

import { useSyncExternalStore } from "react";
import { balancesStore } from "./balanceStore";

/**
 * React hook for subscribing to the global balances store.
 *
 * This hook keeps the component synchronized with the latest accounts balances
 * data. Whenever the store is updated, the component automatically re-renders
 * with the new balances collection.
 *
 * Internally, it uses React's `useSyncExternalStore` API to safely subscribe
 * to the external store.
 *
 * @returns The current collection of balances.
 */
export default function useBalances() {
  return useSyncExternalStore(
    balancesStore.subscribe,
    balancesStore.getBalances,
    balancesStore.getBalances,
  );
}
