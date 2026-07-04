"use client";

import { useSyncExternalStore } from "react";
import { accountsStore } from "./accountsStore";

export default function useAccounts() {
  return useSyncExternalStore(
    accountsStore.subscribe,
    accountsStore.getAccounts,
    accountsStore.getAccounts,
  );
}
