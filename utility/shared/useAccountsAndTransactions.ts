"use client";
import { useCallback } from "react";
import { getAll, getBalances } from "@/utility/db/Database";
import { DatabaseStores } from "@/utility/keys/database";
import useBalances from "@/utility/balance/service/useBalances";
import { getAccountBalances } from "./balancesMethods";
import type { AccountType } from "@/utility/accounts/types";
import type { TransactionType } from "./transactionTypes";

export function useAccountsAndTransactions() {
  const { setBalances } = useBalances();
  const { accountsStore, transactionsStore } = DatabaseStores;

  return useCallback(async () => {
    const [accounts, transactions, serverBalances] = await Promise.all([
      getAll<AccountType>(accountsStore),
      getAll<TransactionType>(transactionsStore),
      getBalances(),
    ]);

    const balances =
      serverBalances ?? getAccountBalances(accounts, transactions);
    setBalances(balances);

    return { accounts, transactions };
  }, [accountsStore, transactionsStore, setBalances]);
}
