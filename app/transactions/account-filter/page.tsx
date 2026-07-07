"use client";

import Button from "@/components/Button";
import NavbarTitle from "@/components/NavbarTitle";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { filterToUrl } from "../methods";
import { useAccounts } from "@/utility/accounts/service/useAccounts";
import AccountsListElement from "@/components/AccountsListElement";
import useBalances from "@/utility/balance/service/useBalances";

export default function AccountFilter() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { getAccounts } = useAccounts();
  const balances = useBalances();

  const [accountFilter, setAccountFilter] = useState<number[]>([]);

  const parseNumberArray = (param: string | null): number[] => {
    if (!param) return [];
    return param
      .split(",")
      .map(Number)
      .filter((n) => !isNaN(n) && n !== 0);
  };

  const transactionsFilter = {
    timeWindow: Number(searchParams.get("time") ?? 29),
    accounts: parseNumberArray(searchParams.get("accounts")),
    categories: parseNumberArray(searchParams.get("categories")),
    tags: parseNumberArray(searchParams.get("tags")),
  };

  useEffect(() => {
    if (getAccounts().length === 0) {
      const currentPath = window.location.pathname + window.location.search;
      router.replace(`/splash?from=${encodeURIComponent(currentPath)}`);
    }
  }, [getAccounts, router]);

  useEffect(() => {
    setAccountFilter(transactionsFilter.accounts);
  }, []);

  if (getAccounts().length === 0) return null;

  const handleApplyFilter = () => {
    const selectedAccounts =
      accountFilter.length === 0
        ? getAccounts().map((item) => item.id)
        : accountFilter;

    const newUrl = `/transactions${filterToUrl({
      ...transactionsFilter,
      accounts:
        selectedAccounts.length !== getAccounts().length
          ? selectedAccounts
          : [],
    })}`;

    router.replace(newUrl);
  };

  return (
    <div className="p-7.5 grid gap-15 w-screen overflow-hidden">
      <div className="grid gap-7.5">
        <NavbarTitle title="حساب‌ها" disabled />
      </div>

      <div className="grid gap-4">
        {getAccounts().map((item) => (
          <AccountsListElement
            account={item}
            balances={balances}
            key={item.id}
            disabled={!accountFilter.includes(item.id)}
            onClick={() => {
              const newArray = [...accountFilter];

              if (accountFilter.includes(item.id)) {
                const index = accountFilter.indexOf(item.id);
                if (index > -1) {
                  newArray.splice(index, 1);
                }
              } else {
                newArray.push(item.id);
              }

              setAccountFilter(newArray);
            }}
          />
        ))}
      </div>

      <Button onClick={handleApplyFilter}>اعمال فیلتر</Button>
    </div>
  );
}
