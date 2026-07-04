"use client";

import { useSyncExternalStore } from "react";
import { balancesStore } from "./balanceStore";

export default function useBalances() {
  return useSyncExternalStore(
    balancesStore.subscribe,
    balancesStore.getBalances,
    balancesStore.getBalances,
  );
}
