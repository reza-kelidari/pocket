"use client";

import AccountsListElement from "@/components/AccountsListElement";
import NavbarTitle from "@/components/NavbarTitle";
import { AccountTypes } from "@/features/accounts/constants";
import useAccounts from "@/features/accounts/service/useAccounts";
import { calculateAccountBalance } from "@/features/balance/methods";
import useTransactions from "@/features/transactions/service/useTransactions";

export default function Page() {
  const accounts = useAccounts();
  const transaction = useTransactions();

  return (
    <div className="p-7.5 grid gap-15">
      <div className="grid gap-7.5">
        <NavbarTitle title="حساب‌ها" redirect="/" />
      </div>

      <div className="grid gap-5">
        {accounts.map((account) => {
          const balance =
            calculateAccountBalance(transaction, account.id).at(-1)?.balance ??
            0;
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
