"use client";

import Capsule from "@/components/Capsule";
import NavbarTitle from "@/components/NavbarTitle";
import AccountsListElement from "@/components/AccountsListElement";
import Left from "@/icons/Left";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { filterToUrl, parseStringArray } from "../methods";
import useBalances from "@/utility/balance/service/useBalances";
import { getAll } from "@/utility/db/Database";
import { AccountType } from "@/utility/accounts/types";
import { DatabaseStores } from "@/utility/keys/database";
import AccountSelectorLoading from "@/components/Skeletons/AccountSelectorLoading";

export default function AccountFilter() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { getBalances } = useBalances();
  const { accountsStore } = DatabaseStores;

  const [accounts, setAccounts] = useState<AccountType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [accountFilter, setAccountFilter] = useState<string[]>([]);

  const timeParamStr = searchParams.get("time");
  const transactionsFilter = {
    timeWindow: timeParamStr ? Number(timeParamStr) : 30,
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
      setAccounts(accs);
      setAccountFilter(transactionsFilter.accounts);
      setIsLoading(false);
    }
    load();
  }, [accountsStore, router]);

  const selectedAccounts =
    accountFilter.length === 0
      ? accounts.map((item) => item.id)
      : accountFilter;

  const applyHref = `/transactions${filterToUrl({
    ...transactionsFilter,
    accounts:
      selectedAccounts.length !== accounts.length ? selectedAccounts : [],
  })}`;

  return (
    <div className="p-7.5 grid gap-15 w-screen overflow-hidden">
      <div className="grid gap-7.5">
        <NavbarTitle title="حساب‌ها" disabled>
          <Capsule Icon={Left} primary href={applyHref} replace>
            اعمال فیلتر
          </Capsule>
        </NavbarTitle>
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {[0, 1, 2, 3].map((item) => (
            <AccountSelectorLoading key={item} />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 animate-fade-in">
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
      )}
    </div>
  );
}
