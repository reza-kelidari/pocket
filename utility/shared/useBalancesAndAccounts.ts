"use client";
import { useCallback } from "react";
import { getAll, getBalances } from "@/utility/db/Database";
import { DatabaseStores } from "@/utility/keys/database";
import useBalances from "@/utility/balance/service/useBalances";
import type { AccountType } from "@/utility/accounts/types";

export function useBalancesAndAccounts() {
  const { setBalances } = useBalances();
  const { accountsStore } = DatabaseStores;

  return useCallback(async () => {
    const [accounts, serverBalances] = await Promise.all([
      getAll<AccountType>(accountsStore),
      getBalances(),
    ]);

    if (serverBalances) {
      setBalances(serverBalances);
    }

    return { accounts };
  }, [accountsStore, setBalances]);
}
