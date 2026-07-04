"use client";

import { AccountType } from "@/features/accounts/types";

let accounts: Array<AccountType> = [];

console.log("Store Created")

const listeners = new Set<() => void>();

export const accountsStore = {
  getAccounts() {
    return accounts;
  },

  setAccounts(data: AccountType[]) {
    accounts = data;

    listeners.forEach((listener) => listener());
  },

  subscribe(listener: () => void) {
    listeners.add(listener);

    return () => listeners.delete(listener);
  },
};
