"use client";

import Capsule from "@/components/Capsule";
import NavbarTitle from "@/components/NavbarTitle";
import TransactionItem from "@/components/TransactionItem";
import Left from "@/icons/Left";
import { useAccounts } from "@/utility/accounts/service/useAccounts";
import useTransactions from "@/utility/transactions/service/useTransactions";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { parseNumberArray, filterToUrl, timeFilters } from "./methods";
import { toJalaliDateArray } from "@/utility/shared/timeMethods";
import { AccountColors } from "@/utility/colors";
import Description from "@/components/Description";
import Filter from "@/icons/Filter";
import Button from "@/components/Button";

export type transactionsFilterType = {
  timeWindow: number;
  accounts: number[];
  categories: number[];
  tags: number[];
};

export default function Transactions() {
  const searchParams = useSearchParams();
  const { getAccounts } = useAccounts();
  const router = useRouter();
  const { getTransactions } = useTransactions();
  const timeFilter = timeFilters(toJalaliDateArray(new Date()));
  const pathname = usePathname();

  const transactionsFilter: transactionsFilterType = useMemo(
    () => ({
      timeWindow: Number(searchParams.get("time") ?? 29),
      accounts: parseNumberArray(searchParams.get("accounts")),
      categories: parseNumberArray(searchParams.get("categories")),
      tags: parseNumberArray(searchParams.get("tags")),
    }),
    [searchParams],
  );

  const filteredTransactions = useMemo(() => {
    const now = Date.now();
    const timeLimit = now - transactionsFilter.timeWindow * 24 * 60 * 60 * 1000;

    return getTransactions()
      .filter((transaction) => {
        if (transaction.time < timeLimit) return false;

        if (
          transactionsFilter.accounts.length > 0 &&
          !transactionsFilter.accounts.includes(transaction.credit) &&
          !transactionsFilter.accounts.includes(transaction.debit)
        ) {
          return false;
        }

        if (
          transactionsFilter.categories.length > 0 &&
          !transactionsFilter.categories.includes(transaction.debit) &&
          !transactionsFilter.categories.includes(transaction.credit)
        ) {
          return false;
        }

        if (
          transactionsFilter.tags.length > 0 &&
          (transaction.tag === undefined ||
            !transactionsFilter.tags.includes(transaction.tag))
        ) {
          return false;
        }

        return true;
      })
      .sort((a, b) => b.time - a.time);
  }, [getTransactions, transactionsFilter]);

  useEffect(() => {
    if (getAccounts().length === 0) {
      const currentPath = window.location.pathname + window.location.search;
      router.replace(`/splash?from=${encodeURIComponent(currentPath)}`);
    }
  }, [getAccounts, router]);

  console.log(
    transactionsFilter.accounts.length > 0 ||
      transactionsFilter.categories.length > 0 ||
      transactionsFilter.tags.length > 0 ||
      transactionsFilter.timeWindow < 29,
  );

  if (getAccounts().length === 0) return null;

  return (
    <div className="p-7.5 flex flex-col gap-15 w-screen overflow-hidden h-screen">
      <div className="grid gap-7.5">
        <NavbarTitle title="تراکنش‌ها" />
        <div className="flex items-center gap-2 overflow-x-scroll scroll-auto w-fill scrollbar-none">
          <span className="me-2">فیلترها</span>
          <Capsule
            Icon={Left}
            href={`/transactions/filter-time${filterToUrl(transactionsFilter)}`}
            replace
            primary={transactionsFilter.timeWindow !== 29}
          >
            {timeFilter.find(
              (filter) => filter.time === transactionsFilter.timeWindow,
            )?.name ?? "۳۰ روز گذشته"}
          </Capsule>
          <Capsule
            Icon={Left}
            href={`/transactions/filter-account${filterToUrl(transactionsFilter)}`}
            replace
            primary={transactionsFilter.accounts.length > 0}
            accountColor={
              transactionsFilter.accounts.length === 1
                ? getAccounts().find(
                    (item) => item.id === transactionsFilter.accounts[0],
                  )?.color
                : undefined
            }
            className={
              transactionsFilter.accounts.length === 1
                ? `${
                    AccountColors[
                      getAccounts().find(
                        (item) => item.id === transactionsFilter.accounts[0],
                      )?.color ?? "black"
                    ].border
                  }
                  ${
                    AccountColors[
                      getAccounts().find(
                        (item) => item.id === transactionsFilter.accounts[0],
                      )?.color ?? "black"
                    ].text
                  }
                  ${
                    AccountColors[
                      getAccounts().find(
                        (item) => item.id === transactionsFilter.accounts[0],
                      )?.color ?? "black"
                    ].surface
                  }`
                : ""
            }
          >
            {transactionsFilter.accounts.length === 0
              ? "همه حساب‌ها"
              : transactionsFilter.accounts.length === 1
                ? getAccounts().find(
                    (item) => item.id === transactionsFilter.accounts[0],
                  )?.name
                : `${transactionsFilter.accounts.length.toLocaleString("fa-ir")} حساب`}
          </Capsule>
        </div>
      </div>

      {filteredTransactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-10 h-full">
          <Filter className="fill-secondary" height={75} width={75} />
          <Description>با فیلتر‌های انتخابی هیچ تراکنشی یافت نشد.</Description>
          {transactionsFilter.accounts.length > 0 ||
          transactionsFilter.categories.length > 0 ||
          transactionsFilter.tags.length > 0 ||
          transactionsFilter.timeWindow < 29 ? (
            <Button onClick={() => router.replace(pathname)}>
              حذف همه فیلتر‌ها
            </Button>
          ) : (
            (transactionsFilter.accounts.length > 0 ||
              transactionsFilter.categories.length > 0 ||
              transactionsFilter.tags.length > 0 ||
              transactionsFilter.timeWindow >= 29) && (
              <Button onClick={() => router.replace(`${pathname}?time=36500`)}>
                نمایش همه تراکنش‌ها
              </Button>
            )
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredTransactions.map((item) => (
            <TransactionItem key={item.id} transaction={item} />
          ))}
        </div>
      )}
    </div>
  );
}
