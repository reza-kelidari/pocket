"use client";

import Button from "@/components/Button";
import NavbarTitle from "@/components/NavbarTitle";
import { useRedirect } from "@/utility/redirect/service/useRedirect";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { filterToUrl } from "../methods";
import useAccounts from "@/utility/accounts/service/useAccounts";
import AccountsListElement from "@/components/AccountsListElement";
import useBalances from "@/utility/balance/service/useBalances";

export default function AccountFilter() {
  const searchParams = useSearchParams();
  const { add, back } = useRedirect();
  const accounts = useAccounts();
  const balances = useBalances();
  const router = useRouter();
  const [accountFilter, setAccountFilter]: [
    accountFilter: number[],
    setAccountFilter: any,
  ] = useState([]);

  const parseNumberArray = (param: string | null): number[] => {
    if (!param) return [];
    return param
      .split(",")
      .map(Number)
      .filter((n) => !isNaN(n) && n !== 0); // فقط اعداد معتبر
  };

  let transactionsFilter = {
    timeWindow: Number(searchParams.get("time") ?? 29),
    accounts: parseNumberArray(searchParams.get("accounts")),
    categories: parseNumberArray(searchParams.get("categories")),
    tags: parseNumberArray(searchParams.get("tags")),
  };

  useEffect(() => {
    add(window.location.pathname);
  }, [add]);

  useEffect(() => {
    if (accounts.length === 0) {
      router.replace(`/splash`);
    }
  }, [accounts.length, router, searchParams]);

  // useEffect(() => {
  //   if (accountFilter.length === 0) {
  //     setAccountFilter(accounts.map((item) => item.id));
  //   }
  // }, [accountFilter]);

  useEffect(() => {
    setAccountFilter(transactionsFilter.accounts);
  }, []);

  if (accounts.length === 0) return null;

  return (
    <div className="p-7.5 grid gap-15 w-screen overflow-hidden">
      <div className="grid gap-7.5">
        <NavbarTitle title="حساب‌ها" disabled />
      </div>

      <div className="grid gap-4">
        {accounts.map((item) => (
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

      <Button
        href={`/transactions${filterToUrl({
          ...transactionsFilter,
          accounts:
            accountFilter.length !== accounts.length ? accountFilter : [],
        })}`}
        onClick={() => {
          back();

          const selectedAccounts =
            accountFilter.length === 0
              ? accounts.map((item) => item.id)
              : accountFilter;

          back();

          router.replace(
            `/transactions${filterToUrl({
              ...transactionsFilter,
              accounts:
                selectedAccounts.length !== accounts.length
                  ? selectedAccounts
                  : [],
            })}`,
          );
        }}
      >
        اعمال فیلتر
      </Button>
    </div>
  );
}
