"use client";

import Button from "@/components/Button";
import ChartView from "@/components/ChartView";
import NavbarTitle from "@/components/NavbarTitle";
import SectionTitle from "@/components/SectionTitle";
import TransactionItem from "@/components/TransactionItem";
import { useAccounts } from "@/utility/accounts/service/useAccounts";
import { getLatestTransactions } from "@/utility/transactions/selector";
import useTransactions from "@/utility/transactions/service/useTransactions";
import Pen from "@/icons/Pen";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function AccountsDetails() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { getAccounts } = useAccounts();
  const transactions = useTransactions() ?? [];
  const accountID = Number(searchParams.get("id"));
  const account = getAccounts().find((item) => item.id === accountID);
  
  const accountTransactions = transactions.filter((item) =>
    [item.debit, item.credit].includes(accountID),
  );

  useEffect(() => {
    // اگر آیدی وجود نداشت یا حسابی نبود، به اسپلش برگردان
    if (isNaN(accountID) || getAccounts().length === 0) {
      const currentPath = window.location.pathname + window.location.search;
      router.replace(`/splash?from=${encodeURIComponent(currentPath)}`);
    }
  }, [accountID, getAccounts, router]);

  if (getAccounts().length === 0 || !account) return null;

  return (
    <div className="p-7.5 grid gap-15">
      <div className="grid gap-7.5">
        <NavbarTitle
          title={account.name}
          option={{ Icon: Pen, link: `/accounts/edit?id=${accountID}` }}
        />
      </div>

      <ChartView
        title={`موجودی ${account.name}`}
        color={account.color}
        timeSelector
        accountID={account.id}
        transactions={transactions}
      />

      <div className="grid gap-7.5">
        <SectionTitle>{`تراکنش‌های اخیر ${account.name}`}</SectionTitle>

        <div className="flex flex-col w-full gap-2.5">
          {getLatestTransactions(accountTransactions, 5).map((transaction) => (
            <TransactionItem
              key={transaction.id}
              transaction={transaction}
            />
          ))}
        </div>
        <Button href={`/transactions?accounts=${accountID}`}>
          مشاهده همه تراکنش‌ها
        </Button>
      </div>
    </div>
  );
}