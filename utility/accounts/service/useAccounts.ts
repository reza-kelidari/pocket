"use client";

import { useSyncExternalStore } from "react";
import { accountsStore } from "./accountsStore";

export function useAccounts() {
  const acounts = useSyncExternalStore(
    accountsStore.subscribe,
    accountsStore.getSnapshot,
    accountsStore.getSnapshot,
  );

  return {
    acounts,
    addAccount: accountsStore.addAccount.bind(accountsStore),
    clear: accountsStore.clear.bind(accountsStore),
    getAccounts: accountsStore.getAccounts.bind(accountsStore),
    getSnapshot: accountsStore.getSnapshot.bind(accountsStore),
    removeAccount: accountsStore.removeAccount.bind(accountsStore),
    setAccounts: accountsStore.setAccounts.bind(accountsStore),
    subscribe: accountsStore.subscribe.bind(accountsStore),
    updateAccount: accountsStore.updateAccount.bind(accountsStore),
  };
}
