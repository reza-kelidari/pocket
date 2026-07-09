"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { transactionsStore } from "@/utility/transactions/service/transactionsStore";
import { accountsStore } from "@/utility/accounts/service/accountsStore";
import { balancesStore } from "@/utility/balance/service/balancesStore";
import { getAccountBalances } from "@/utility/shared/balancesMethods";
import { getAll, putItem } from "@/utility/db/Database";
import {
  getDefaultAccounts,
  getDefaultTransactions,
} from "@/utility/db/defaults";
import { AccountType } from "@/utility/accounts/types";
import { TransactionType } from "@/utility/transactions/types";

export default function Splash() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const fromPath = searchParams.get("from") || "/";

  useEffect(() => {
    async function load() {
      try {
        let accounts = (await getAll("accounts")) as AccountType[];
        let transactions = (await getAll("transactions")) as TransactionType[];

        if (accounts.length === 0) {
          accounts = getDefaultAccounts();
          for (const acc of accounts) {
            await putItem("accounts", acc);
          }
        }

        if (transactions.length === 0) {
          transactions = getDefaultTransactions();
          for (const tx of transactions) {
            await putItem("transactions", tx);
          }
        }

        accountsStore.setAccounts(accounts);
        transactionsStore.setTransactions(transactions);

        balancesStore.setBalances(getAccountBalances(accounts, transactions));

        sessionStorage.setItem("splashShown", "1");
        router.replace(fromPath);
      } catch (error) {
      }
    }

    const timer = setTimeout(load, 100);
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
