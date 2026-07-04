"use client";

import { AccountBalance } from "../types";

let balances: AccountBalance = [];

const listeners = new Set<() => void>();

export const balancesStore = {
  getBalances() {
    return balances;
  },

  setBalances(data: AccountBalance) {
    balances = data;

    listeners.forEach((listener) => listener());
  },

  subscribe(listener: () => void) {
    listeners.add(listener);

    return () => listeners.delete(listener);
  },
};
