"use client";

import { useSyncExternalStore } from "react";
import { transactionsStore } from "./transactionsStore";

export default function useAccounts() {
  return useSyncExternalStore(
    transactionsStore.subscribe,
    transactionsStore.getTransactions,
    transactionsStore.getTransactions,
  );
}
