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

function AccountSelectorSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex items-center justify-between p-4 rounded-2xl border border-elements-border bg-elements-background animate-pulse"
    >
      <div className="grid gap-2.5">
        <div className="text-sm w-28 rounded-md bg-elements-border text-transparent select-none">
          {"\u00A0"}
        </div>
        <div className="text-xs w-16 rounded-md bg-elements-border text-transparent select-none">
          {"\u00A0"}
        </div>
      </div>

      <div className="h-7.5 w-7.5 rounded-4xl bg-elements-border" />
    </div>
  );
}

export default function AccountSelector() {
  const { getBalances } = useBalances();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { accountsStore } = DatabaseStores;

  const accountParam = searchParams.get("type") as
    | "toAccount"
    | "fromAccount"
    | null;

  const [accounts, setAccounts] = useState<AccountType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [draftTransaction] = useState<TransactionType | null>(() => {
    if (typeof window === "undefined") return null;

    const data = sessionStorage.getItem(CREATE_TRANSACTION_KEY);
    if (!data) return null;

    try {
      return JSON.parse(data) as TransactionType;
    } catch {
      return null;
    }
  });

  const transactionType = draftTransaction?.type ?? null;

  const selectedId = (() => {
    if (!draftTransaction) return "";

    if (accountParam === "fromAccount") {
      return draftTransaction.credit || "";
    }

    return draftTransaction.type === "credit"
      ? draftTransaction.credit || ""
      : draftTransaction.debit || "";
  })();

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
    } catch {}

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

  const visibleAccounts = accounts.filter(
    (item) => transactionType === "transfer" || !item.hidden,
  );

  const balancesCount = getBalances().length;

  const skeletonCount =
    transactionType === "transfer"
      ? Math.max(balancesCount, 4)
      : Math.max(balancesCount - 1, 3);

  return (
    <div className="p-7.5 grid gap-15 w-screen overflow-hidden">
      <div className="grid gap-7.5">
        <NavbarTitle title={navbarTitle} disabled />
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {Array.from({ length: skeletonCount }).map((_, index) => (
            <AccountSelectorSkeleton key={index} />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 animate-fade-in">
          {visibleAccounts.map((item) => {
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
      )}
    </div>
  );
}
