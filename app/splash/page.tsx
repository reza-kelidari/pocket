"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { balancesStore } from "@/utility/balance/service/balancesStore";
import { getAccountBalances } from "@/utility/shared/balancesMethods";
import { getAll, putItem } from "@/utility/db/Database";
import {
  getDefaultAccounts,
  getDefaultTransactions,
} from "@/utility/db/defaults";
import { DatabaseStores } from "@/utility/keys/database";
import { AccountType } from "@/utility/accounts/types";
import { TransactionType } from "@/utility/transactions/types";
import { SplashShownKey } from "@/utility/keys/sessionStore";

export default function Splash() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { accountsStore, transactionsStore } = DatabaseStores;

  const fromPath = searchParams.get("from") || "/";

  useEffect(() => {
    async function load() {
      try {
        let accounts = (await getAll<AccountType>(accountsStore));
        let transactions = (await getAll(
          transactionsStore,
        )) as TransactionType[];

        if (accounts.length === 0) {
          accounts = getDefaultAccounts();
          for (const acc of accounts) {
            await putItem(accountsStore, acc);
          }
        }

        if (transactions.length === 0) {
          transactions = getDefaultTransactions();
          for (const tx of transactions) {
            await putItem(transactionsStore, tx);
          }
        }

        balancesStore.setBalances(getAccountBalances(accounts, transactions));

        
        sessionStorage.setItem(SplashShownKey, "1");
        router.replace(fromPath);
      } catch (error) {}
    }

    const timer = setTimeout(load, 1000);
    return () => clearTimeout(timer);
  }, [router, fromPath]);

  return (
    <div className="flex flex-col place-content-center items-center h-screen relative">
      <Image src="/logo.svg" alt="Logo" height={50} width={50} />
      <br />
      <p className="font-extralight">مدیریت مالی شخصی جیب</p>

      <span className="text-secondary absolute bottom-10 left-1/2 -translate-x-1/2 text-xs">
        درحال بارگذاری ...
      </span>
    </div>
  );
}
