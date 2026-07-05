"use client";

import { useSyncExternalStore } from "react";
import { transactionsStore } from "./transactionsStore";

export default function useTransactions() {
  return useSyncExternalStore(
    transactionsStore.subscribe,
    transactionsStore.getTransactions,
    transactionsStore.getTransactions,
  );
}
