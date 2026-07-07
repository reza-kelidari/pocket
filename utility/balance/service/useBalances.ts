"use client";

import { useSyncExternalStore } from "react";
import { balancesStore } from "./balanceStore";

export default function useBalances() {
  const balances = useSyncExternalStore(
    balancesStore.subscribe,
    balancesStore.getSnapshot,
    balancesStore.getSnapshot,
  );

  return {
    balances,
    addBalance: balancesStore.addBalance.bind(balancesStore),
    updateBalance: balancesStore.updateBalance.bind(balancesStore),
    removeBalance: balancesStore.removeBalance.bind(balancesStore),
    clear: balancesStore.clear.bind(balancesStore),
    getBalances: balancesStore.getBalances.bind(balancesStore),
    getSnapshot: balancesStore.getSnapshot.bind(balancesStore),
    setBalances: balancesStore.setBalances.bind(balancesStore),
    subscribe: balancesStore.subscribe.bind(balancesStore),
  };
}