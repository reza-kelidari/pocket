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
    getBalances: balancesStore.getBalances.bind(balancesStore),
    getSnapshot: balancesStore.getSnapshot.bind(balancesStore),
    setBalances: balancesStore.setBalances.bind(balancesStore),
    addBalance: balancesStore.addBalance.bind(balancesStore),
    subscribe: balancesStore.subscribe.bind(balancesStore),
  };
}
