"use client";

import getAccountsList from "@/utility/accounts/service/initializer";
import getTransactionsList from "@/utility/transactions/service/initializer";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { transactionsStore } from "@/utility/transactions/service/transactionsStore";
import { getAccountBalanceHistory } from "@/utility/balance/methods";
import { AccountBalanceType } from "@/utility/balance/types";
import { balancesStore } from "@/utility/balance/service/balanceStore";
import { useRedirect } from "@/utility/redirect/service/useRedirect";
import { useAccounts } from "@/utility/accounts/service/useAccounts";

export default function Splash() {
  const router = useRouter();
  const { last: redirect } = useRedirect();
  const { setAccounts } = useAccounts();

  useEffect(() => {
    async function load() {
      const accounts = await getAccountsList();
      const transactions = await getTransactionsList();

      setAccounts(accounts);
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

      router.replace(redirect());
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
