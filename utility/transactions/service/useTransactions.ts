"use client";

import { useSyncExternalStore } from "react";
import { transactionsStore } from "./transactionsStore";

export default function useTransactions() {
  const transactions = useSyncExternalStore(
    transactionsStore.subscribe,
    transactionsStore.getSnapshot,
    transactionsStore.getSnapshot,
  );

  return {
    transactions,
    addTransaction: transactionsStore.addTransaction.bind(transactionsStore),
    updateTransaction: transactionsStore.updateTransaction.bind(transactionsStore),
    removeTransaction: transactionsStore.removeTransaction.bind(transactionsStore),
    clear: transactionsStore.clear.bind(transactionsStore),
    getTransactions: transactionsStore.getTransactions.bind(transactionsStore),
    getSnapshot: transactionsStore.getSnapshot.bind(transactionsStore),
    setTransactions: transactionsStore.setTransactions.bind(transactionsStore),
    subscribe: transactionsStore.subscribe.bind(transactionsStore),
  };
}