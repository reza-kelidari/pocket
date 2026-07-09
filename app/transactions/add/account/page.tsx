"use client";

import AccountsListElement from "@/components/AccountsListElement";
import NavbarTitle from "@/components/NavbarTitle";
import { useAccounts } from "@/utility/accounts/service/useAccounts";
import useBalances from "@/utility/balance/service/useBalances";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CREATE_TRANSACTION_KEY } from "../page";
import { TransactionType } from "@/utility/transactions/types";

export default function AccountSelector() {
  const { getAccounts } = useAccounts();
  const { getBalances } = useBalances();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // پارامتر ورودی: toAccount (مقصد) یا fromAccount (مبدأ)
  const accountParam = searchParams.get("type") as
    | "toAccount"
    | "fromAccount"
    | null;

  const [selectedId, setSelectedId] = useState<number>(0);
  const [transactionType, setTransactionType] = useState<
    TransactionType["type"] | null
  >(null);

  useEffect(() => {
    if (getAccounts().length === 0) router.replace(`/splash?from=${pathname}`);
  }, [getAccounts, router, pathname]);

  useEffect(() => {
    // خواندن آیدی حساب فعلی و نوع تراکنش برای تنظیمات اولیه
    const data = sessionStorage.getItem(CREATE_TRANSACTION_KEY);
    if (!data) return;

    try {
      const parsed = JSON.parse(data) as TransactionType;
      setTransactionType(parsed.type);

      const currentSelected =
        accountParam === "fromAccount"
          ? parsed.credit
          : parsed.type === "credit"
            ? parsed.credit
            : parsed.debit;
      setSelectedId(currentSelected || 0);
    } catch (e) {}
  }, [accountParam]);

  function handleSelect(id: number): void {
    const data = sessionStorage.getItem(CREATE_TRANSACTION_KEY);
    if (!data) {
      router.back();
      return;
    }

    try {
      const currentTransaction = JSON.parse(data) as TransactionType;
      let update: Partial<TransactionType> = {};

      if (currentTransaction.type === "transfer") {
        update =
          accountParam === "fromAccount" ? { credit: id } : { debit: id };
      } else if (currentTransaction.type === "debit") {
        update = { debit: id };
      } else if (currentTransaction.type === "credit") {
        update = { credit: id };
      }

      const newData = JSON.stringify({ ...currentTransaction, ...update });
      sessionStorage.setItem(CREATE_TRANSACTION_KEY, newData);
    } catch (e) {}

    router.back();
  }

  if (getAccounts().length === 0) return null;

  // منطق تعیین عنوان صفحه بر اساس نوع تراکنش و پارامتر ورودی
  let navbarTitle = "انتخاب حساب";
  if (
    transactionType === "debit" ||
    (transactionType === "transfer" && accountParam === "toAccount")
  ) {
    navbarTitle = "حساب مقصد";
  } else if (
    transactionType === "credit" ||
    (transactionType === "transfer" && accountParam === "fromAccount")
  ) {
    navbarTitle = "حساب مبدأ";
  }

  return (
    <div className="p-7.5 grid gap-15 w-screen overflow-hidden">
      <div className="grid gap-7.5">
        <NavbarTitle title={navbarTitle} disabled />
      </div>
      <div className="grid gap-4">
        {getAccounts().map((item) => {
          const isSelected = selectedId === item.id;
          
          return (
            <AccountsListElement
              key={item.id}
              onClick={() => handleSelect(item.id)}
              account={item}
              balances={getBalances()}
              desaturated={!!selectedId && !isSelected}
            />
          );
        })}
      </div>
    </div>
  );
}
