"use client";

import { AccountBalanceType } from "../types";

let balances: AccountBalanceType = [];

const listeners = new Set<() => void>();

export const balancesStore = {
  getBalances() {
    return balances;
  },

  setBalances(data: AccountBalanceType) {
    balances = data;

    listeners.forEach((listener) => listener());
  },

  subscribe(listener: () => void) {
    listeners.add(listener);

    return () => listeners.delete(listener);
  },
};
