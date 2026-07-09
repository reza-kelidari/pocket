"use client";

import getAccountsList from "@/utility/accounts/service/initializer";
import getTransactionsList from "@/utility/transactions/service/initializer";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { transactionsStore } from "@/utility/transactions/service/transactionsStore";
import {
  getAccountBalances,
} from "@/utility/shared/balancesMethods";
import { useAccounts } from "@/utility/accounts/service/useAccounts";
import useBalances from "@/utility/balance/service/useBalances";

export default function Splash() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setBalances } = useBalances();
  const { setAccounts } = useAccounts();

  const fromPath = searchParams.get("from") || "/";

  useEffect(() => {
    async function load() {
      const accounts = await getAccountsList();
      const transactions = await getTransactionsList();

      setAccounts(accounts);
      transactionsStore.setTransactions(transactions);

      setBalances(getAccountBalances(accounts, transactions));

      sessionStorage.setItem("splashShown", "1");

      router.replace(fromPath);
    }

    const timer = setTimeout(load, 500);
    return () => clearTimeout(timer);
  }, [router, fromPath, setAccounts]);

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
