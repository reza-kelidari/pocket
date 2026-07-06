"use client";

import Capsule from "@/components/Capsule";
import NavbarTitle from "@/components/NavbarTitle";
import TransactionItem from "@/components/TransactionItem";
import Left from "@/icons/Left";
import useAccounts from "@/utility/accounts/service/useAccounts";
import { useRedirect } from "@/utility/redirect/service/useRedirect";
import useTransactions from "@/utility/transactions/service/useTransactions";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useMemo, useRef } from "react";
import { parseNumberArray, filterToUrl, timeFilters } from "./methods";
import { persianDateToEnglishNumber } from "@/utility/time/methods";
import { AccountColors } from "@/utility/colors";

export type transactionsFilterType = {
  timeWindow: number;
  accounts: number[];
  categories: number[];
  tags: number[];
};

export default function Transactions() {
  const searchParams = useSearchParams();
  const accounts = useAccounts();
  const router = useRouter();
  const transactions = useTransactions();
  const { add: addRedirect, last: lastRedirect, replaceLast } = useRedirect();
  const timeFilter = timeFilters(persianDateToEnglishNumber(new Date()));

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

    return [...transactions]
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
  }, [transactions, transactionsFilter]);

  useEffect(() => {
    if (accounts.length === 0) {
      router.replace(`/splash`);
    }
  }, [accounts.length, router, searchParams]);

  useEffect(() => {
    if (!lastRedirect().includes(window.location.pathname))
      addRedirect(window.location.pathname);
    else replaceLast(window.location.pathname + window.location.search);
  }, [searchParams]);

  if (accounts.length === 0) return null;

  return (
    <div className="p-7.5 grid gap-15 w-screen overflow-hidden">
      <div className="grid gap-7.5">
        <NavbarTitle title="تراکنش‌ها" />
        <div className="flex items-center gap-2 overflow-x-scroll scroll-auto w-fill scrollbar-none">
          <Capsule
            Icon={Left}
            href={`/transactions/time-filter${filterToUrl(transactionsFilter)}`}
            primary={transactionsFilter.timeWindow !== 29}
          >
            {
              timeFilter.find(
                (filter) => filter.time === transactionsFilter.timeWindow,
              )?.name ?? "۳۰ روز گذشته"
            }
          </Capsule>
          <Capsule
            Icon={Left}
            href={`/transactions/account-filter${filterToUrl(transactionsFilter)}`}
            primary={transactionsFilter.accounts.length > 0}
            accountColor={
              transactionsFilter.accounts.length === 1
                ? accounts.find(
                    (item) => item.id === transactionsFilter.accounts[0],
                  )?.color
                : undefined
            }
            className={
              transactionsFilter.accounts.length === 1
                ? `${
                    AccountColors[
                      accounts.find(
                        (item) => item.id === transactionsFilter.accounts[0],
                      )?.color ?? "black"
                    ].border
                  }
                  ${
                    AccountColors[
                      accounts.find(
                        (item) => item.id === transactionsFilter.accounts[0],
                      )?.color ?? "black"
                    ].text
                  }
                  ${
                    AccountColors[
                      accounts.find(
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
                ? accounts.find(
                    (item) => item.id === transactionsFilter.accounts[0],
                  )?.name
                : `${transactionsFilter.accounts.length.toLocaleString("fa-ir")} حساب`}
          </Capsule>
        </div>
      </div>

      <div className="grid gap-4">
        {filteredTransactions.map((item) => (
          <TransactionItem key={item.id} transaction={item} />
        ))}
      </div>
    </div>
  );
}
