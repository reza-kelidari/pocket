"use client";

import getAccountsList from "@/features/accounts/service/initializer";
import getTransactionsList from "@/features/transactions/service/initializer";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { accountsStore } from "@/features/accounts/service/accountsStore";
import { transactionsStore } from "@/features/transactions/service/transactionsStore";
import { getAccountBalanceHistory } from "@/features/balance/methods";
import { AccountBalanceType } from "@/features/balance/types";
import { balancesStore } from "@/features/balance/service/balanceStore";

export default function Splash() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    async function load() {
      const accounts = await getAccountsList();
      const transactions = await getTransactionsList();

      accountsStore.setAccounts(accounts);
      transactionsStore.setTransactions(transactions);

      let balances: AccountBalanceType[] = [];

      accounts.forEach((account) => {
        const calculatedbalances = getAccountBalanceHistory(
          transactions.filter(
            (item) => item.debit === account.id || item.credit === account.id,
          ),
          account.id,
        );
        balances.push(calculatedbalances);
      });

      balancesStore.setBalances(balances);

      sessionStorage.setItem("splashShown", "1");

      router.replace(searchParams.get("redirect") ?? "/");
    }

    setTimeout(load, 500);
  }, []);

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
