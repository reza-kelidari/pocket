"use client";

import { TransactionType } from "../types";

let transactions: Array<TransactionType> = [];

const listeners = new Set<() => void>();

export const transactionsStore = {
  getTransactions() {
    return transactions;
  },

  setTransactions(data: TransactionType[]) {
    transactions = data;

    listeners.forEach((listener) => listener());
  },

  subscribe(listener: () => void) {
    listeners.add(listener);

    return () => listeners.delete(listener);
  },
};
