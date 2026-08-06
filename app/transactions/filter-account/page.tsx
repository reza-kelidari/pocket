"use client";

import Button from "@/components/Button";
import NavbarTitle from "@/components/NavbarTitle";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { filterToUrl, parseStringArray } from "../methods";
import AccountsListElement from "@/components/AccountsListElement";
import useBalances from "@/utility/balance/service/useBalances";
import { getAll } from "@/utility/db/Database";
import { AccountType } from "@/utility/accounts/types";
import { DatabaseStores } from "@/utility/keys/database";

export default function AccountFilter() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { getBalances } = useBalances();
  const { accountsStore } = DatabaseStores;

  const [accounts, setAccounts] = useState<AccountType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [accountFilter, setAccountFilter] = useState<string[]>([]);

  const transactionsFilter = {
    timeWindow: Number(searchParams.get("time") ?? 29),
    accounts: parseStringArray(searchParams.get("accounts")),
    categories: parseStringArray(searchParams.get("categories")),
    tags: parseStringArray(searchParams.get("tags")),
  };

  useEffect(() => {
    async function load() {
      const accs = (await getAll(accountsStore)) as AccountType[];
      if (accs.length === 0) {
        const currentPath = window.location.pathname + window.location.search;
        router.replace(`/splash?from=${encodeURIComponent(currentPath)}`);
        return;
      }
      accs.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      setAccounts(accs);
      setAccountFilter(transactionsFilter.accounts);
      setIsLoading(false);
    }
    load();
  }, [accountsStore, router]);

  const handleApplyFilter = () => {
    const selectedAccounts =
      accountFilter.length === 0
        ? accounts.map((item) => item.id)
        : accountFilter;

    const newUrl = `/transactions${filterToUrl({
      ...transactionsFilter,
      accounts:
        selectedAccounts.length !== accounts.length ? selectedAccounts : [],
    })}`;

    router.replace(newUrl);
  };

  if (isLoading) return null;

  return (
    <div className="p-7.5 grid gap-15 w-screen overflow-hidden">
      <div className="grid gap-7.5">
        <NavbarTitle title="حساب‌ها" disabled />
      </div>

      <div className="grid gap-4">
        {accounts.map((item) => (
          <AccountsListElement
            account={item}
            balances={getBalances()}
            key={item.id}
            disabled={!accountFilter.includes(item.id)}
            onClick={() => {
              setAccountFilter((prev) => {
                if (prev.includes(item.id))
                  return prev.filter((id) => id !== item.id);
                return [...prev, item.id];
              });
            }}
          />
        ))}
      </div>

      <Button onClick={handleApplyFilter}>اعمال فیلتر</Button>
    </div>
  );
}
