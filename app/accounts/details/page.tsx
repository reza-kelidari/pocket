"use client";

import Button from "@/components/Button";
import ChartView from "@/components/ChartView";
import NavbarTitle from "@/components/NavbarTitle";
import SectionTitle from "@/components/SectionTitle";
import TransactionItem from "@/components/TransactionItem";
import useAccounts from "@/utility/accounts/service/useAccounts";
import useBalances from "@/utility/balance/service/useBalances";
import { getLatestTransactions } from "@/utility/transactions/selector";
import useTransactions from "@/utility/transactions/service/useTransactions";
import Pen from "@/icons/Pen";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useRedirect } from "@/utility/redirect/service/useRedirect";

export default function AccountsDetails() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const accountsList = useAccounts();
  const transactions = useTransactions() ?? [];
  const accountsBalances = useBalances() ?? [];
  const accountID = Number(searchParams.get("id"));
  const account = accountsList.find((item) => item.id === accountID);
  const accountTransactions = transactions.filter((item) =>
    [item.debit, item.credit].includes(accountID),
  );
  let [redirect, setRedirect] = useState("");
  const { add: addRedirect } = useRedirect();

  useEffect(() => {
    setRedirect(window.location.pathname + window.location.search);

    if (isNaN(accountID)) router.replace("/");
    if (accountsList.length === 0) router.replace(`/splash`);
  }, []);

  useEffect(() => {
    addRedirect(redirect);
  }, [addRedirect, redirect]);

  if (accountsList.length === 0) return;
  else
    return (
      <div className="p-7.5 grid gap-15">
        <div className="grid gap-7.5">
          <NavbarTitle
            title={account?.name ?? "حساب"}
            option={{ Icon: Pen, link: `/accounts/edit?id=${accountID}` }}
          />
        </div>

        <ChartView
          title={`موجودی ${account?.name ?? ""}`}
          color={account?.color}
          timeSelector
          accountID={account?.id}
          transactions={transactions}
          balances={accountsBalances}
        />

        <div className="grid gap-7.5">
          <SectionTitle>{`تراکنش‌های اخیر ${account?.name ?? ""}`}</SectionTitle>

          <div className="flex flex-col w-full gap-2.5">
            {getLatestTransactions(accountTransactions, 5).map(
              (transaction) => {
                let transactionAccountID: number;
                let transactionName: string;

                if (transaction.type === "credit")
                  transactionAccountID = transaction.credit;
                else transactionAccountID = transaction.debit;

                transactionName =
                  transaction.type === "initial"
                    ? "موجودی اولیه"
                    : transaction.name;

                return (
                  <TransactionItem
                    key={transaction.id}
                    transaction={transaction}
                  />
                );
              },
            )}
          </div>
          <Button link={`/transactions?account=${accountID}`}>
            مشاهده همه تراکنش‌ها
          </Button>
        </div>
      </div>
    );
}
