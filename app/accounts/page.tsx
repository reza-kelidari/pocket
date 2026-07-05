"use client";

import AccountsListElement from "@/components/AccountsListElement";
import NavbarTitle from "@/components/NavbarTitle";
import { AccountTypes } from "@/features/accounts/constants";
import useAccounts from "@/features/accounts/service/useAccounts";
import useBalances from "@/features/balance/service/useBalances";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Accounts() {
  const accounts = useAccounts();
  const balances = useBalances();
  const router = useRouter();

  useEffect(() => {
    if(accounts.length === 0)
      router.replace(`/splash?redirect=/accounts`)
  }, [])

  return (
    <div className="p-7.5 grid gap-15">
      <div className="grid gap-7.5">
        <NavbarTitle title="حساب‌ها" redirect="/" />
      </div>

      <div className="grid gap-5">
        {accounts.map((account) => {
          const balance = balances.find(item => item.id == account.id)?.history?.at(-1)?.balance ?? 0;
          return (
            <AccountsListElement
              key={account.id}
              name={account.name}
              id={account.id}
              color={account.color}
              Icon={AccountTypes[account.type].icon}
              balance={balance}
            />
          );
        })}
      </div>
    </div>
  );
}
