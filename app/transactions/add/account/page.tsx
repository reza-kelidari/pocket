"use client";

import AccountsListElement from "@/components/AccountsListElement";
import NavbarTitle from "@/components/NavbarTitle";
import useBalances from "@/utility/balance/service/useBalances";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CREATE_TRANSACTION_KEY } from "../page";
import { TransactionType } from "@/utility/transactions/types";
import { AccountType } from "@/utility/accounts/types";
import { getAll } from "@/utility/db/Database";
import { DatabaseStores } from "@/utility/keys/database";

export default function AccountSelector() {
  const { getBalances } = useBalances();
  const router = useRouter();
  const [accounts, setAccounts] = useState<AccountType[]>([]);
  const [isLoading, setIsLoading] = useState(true); 
  const searchParams = useSearchParams();
  const { accountsStore } = DatabaseStores;

  const accountParam = searchParams.get("type") as
    | "toAccount"
    | "fromAccount"
    | null;

  const [selectedId, setSelectedId] = useState<string>();
  const [transactionType, setTransactionType] = useState<
    TransactionType["type"] | null
  >(null);

  useEffect(() => {
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
      setSelectedId(currentSelected || "");
    } catch (e) {}
  }, [accountParam]);

  useEffect(() => {
    (async () => {
      try {
        setAccounts(
          (await getAll<AccountType>(accountsStore)).sort(
            (a, b) => a.order - b.order,
          ),
        );
      } finally {
        setIsLoading(false);
      }
    })();
  }, [accountsStore]);

  function handleSelect(id: string): void {
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
    <div className="p-7.5 grid gap-15 w-screen overflow-hidden animate-fade-in">
      <div className="grid gap-7.5">
        <NavbarTitle title={navbarTitle} disabled />
      </div>
      <div className="grid gap-4">
        {isLoading ? (
          <>
            <div className="h-16 w-full bg-elements-background border border-elements-border rounded-2xl animate-pulse"></div>
            <div className="h-16 w-full bg-elements-background border border-elements-border rounded-2xl animate-pulse"></div>
            <div className="h-16 w-full bg-elements-background border border-elements-border rounded-2xl animate-pulse"></div>
            <div className="h-16 w-full bg-elements-background border border-elements-border rounded-2xl animate-pulse"></div>
          </>
        ) : (
          accounts.map((item) => {
            const isSelected = selectedId === item.id;
            const isTransfer = transactionType === "transfer";

            return (
              (!item.hidden || isTransfer) && (
                <AccountsListElement
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  account={item}
                  balances={getBalances()}
                  desaturated={!!selectedId && !isSelected}
                />
              )
            );
          })
        )}
      </div>
    </div>
  );
}
