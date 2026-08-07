"use client";

import Capsule from "@/components/Capsule";
import NavbarTitle from "@/components/NavbarTitle";
import TransactionItem from "@/components/TransactionItem";
import TransactionItemLoading from "@/components/TransactionItemLoading";
import Left from "@/icons/Left";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  filterToUrl,
  parseStringArray,
  timeFilters,
  TransactionsFilterType,
} from "./methods";
import { toJalaliDateArray } from "@/utility/shared/timeMethods";
import { AccountColors } from "@/utility/shared/colors";
import Description from "@/components/Description";
import Filter from "@/icons/Filter";
import Button from "@/components/Button";
import { AccountType } from "@/utility/accounts/types";
import { TransactionType } from "@/utility/transactions/types";
import { deleteItem, getAll } from "@/utility/db/Database";
import { DatabaseStores } from "@/utility/keys/database";
import SwipeableElement from "@/components/SwipeableElement";

export type transactionsFilterType = {
  timeWindow: number;
  accounts: string[];
  categories: string[];
  tags: string[];
};

export default function Transactions() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [transactions, setTransactions] = useState<TransactionType[]>([]);
  const [accounts, setAccounts] = useState<AccountType[]>([]);
  const timeFilter = timeFilters(toJalaliDateArray(new Date()));
  const pathname = usePathname();
  const { accountsStore, transactionsStore } = DatabaseStores;
  const [swipedItem, setSwipedItem] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const transactionsFilter: TransactionsFilterType = useMemo(
    () => ({
      timeWindow: Number(searchParams.get("time") ?? 29),
      accounts: parseStringArray(searchParams.get("accounts")),
      categories: parseStringArray(searchParams.get("categories")),
      tags: parseStringArray(searchParams.get("tags")),
    }),
    [searchParams],
  );

  const filteredTransactions = useMemo(() => {
    const now = Date.now();
    const timeLimit = now - transactionsFilter.timeWindow * 24 * 60 * 60 * 1000;

    return transactions
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
    (async () => {
      try {
        setTransactions(await getAll<TransactionType>(transactionsStore));
        setAccounts(await getAll<AccountType>(accountsStore));
      } catch (error) {
        console.error("Failed to load transactions:", error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [accountsStore, transactionsStore]);

  return (
    <div className="p-7.5 flex flex-col gap-15 w-screen overflow-hidden min-h-screen animate-fade-in">
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

      {/* ✅ بخش نمایش لودینگ یا لیست تراکنش‌ها */}
      {isLoading ? (
        <div className="grid gap-4">
          <TransactionItemLoading />
          <TransactionItemLoading />
          <TransactionItemLoading />
          <TransactionItemLoading />
          <TransactionItemLoading />
        </div>
      ) : filteredTransactions.length === 0 ? (
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
          {filteredTransactions.map((transaction) => {
            const accountID =
              transaction.type === "credit"
                ? transaction.credit
                : transaction.debit;
            const account = accounts.find((acc) => acc.id === accountID);

            if (!account) return null;

            return (
              <SwipeableElement
                isOpen={transaction.id === swipedItem}
                onOpenChange={() => setSwipedItem(transaction.id)}
                onCloseOthers={() => setSwipedItem(null)}
                onEdit={() =>
                  transaction.type !== "initial"
                    ? router.push(`/transactions/edit?id=${transaction.id}`)
                    : router.push(`/accounts/edit?id=${account.id}`)
                }
                onDelete={
                  transaction.type !== "initial"
                    ? async () => {
                        await deleteItem(transactionsStore, transaction.id);

                        setTransactions((prev) =>
                          prev.filter((t) => t.id !== transaction.id),
                        );

                        setSwipedItem(null);
                      }
                    : undefined
                }
                key={transaction.id}
              >
                <TransactionItem transaction={transaction} account={account} />
              </SwipeableElement>
            );
          })}
        </div>
      )}
    </div>
  );
}
