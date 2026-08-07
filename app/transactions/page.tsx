"use client";

import Capsule from "@/components/Capsule";
import NavbarTitle from "@/components/NavbarTitle";
import TransactionItem from "@/components/TransactionItem";
import TransactionItemLoading from "@/components/TransactionItemLoading";
import Left from "@/icons/Left";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

export default function Transactions() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const { accountsStore, transactionsStore } = DatabaseStores;

  const [transactions, setTransactions] = useState<TransactionType[]>([]);
  const [accounts, setAccounts] = useState<AccountType[]>([]);
  const [swipedItem, setSwipedItem] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isChangingFilter, setIsChangingFilter] = useState(false);
  const isChangingFilterRef = useRef(false);

  const timeFilter = timeFilters(toJalaliDateArray(new Date()));

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
    let isMounted = true;

    (async () => {
      try {
        const [transactionsData, accountsData] = await Promise.all([
          getAll<TransactionType>(transactionsStore),
          getAll<AccountType>(accountsStore),
        ]);

        if (!isMounted) return;

        setTransactions(transactionsData);
        setAccounts(accountsData);
      } catch (error) {
        console.error("Failed to load transactions:", error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [accountsStore, transactionsStore]);

  const navigateWithLoading = useCallback(
    (url: string) => {
      if (isChangingFilterRef.current) return;

      isChangingFilterRef.current = true;
      setIsChangingFilter(true);

      window.scrollTo({ top: 0 });
      router.replace(url);
    },
    [router],
  );

  useEffect(() => {
    if (!isChangingFilter) return;

    const timeout = setTimeout(() => {
      isChangingFilterRef.current = false;
      setIsChangingFilter(false);
    }, 450);

    return () => clearTimeout(timeout);
  }, [isChangingFilter, searchParams]);

  const selectedAccount =
    transactionsFilter.accounts.length === 1
      ? accounts.find((item) => item.id === transactionsFilter.accounts[0])
      : undefined;

  const showSkeleton = isLoading || isChangingFilter;

  return (
    <div className="p-7.5 flex flex-col gap-15 w-screen overflow-hidden min-h-screen">
      <div className="grid gap-7.5">
        <NavbarTitle title="تراکنش‌ها" />

        <div className="flex items-center gap-2 overflow-x-scroll scroll-auto w-full scrollbar-none">
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
            accountColor={selectedAccount?.color}
            className={
              selectedAccount
                ? `${AccountColors[selectedAccount.color].border} ${AccountColors[selectedAccount.color].text} ${AccountColors[selectedAccount.color].surface}`
                : ""
            }
          >
            {transactionsFilter.accounts.length === 0
              ? "همه حساب‌ها"
              : transactionsFilter.accounts.length === 1
                ? selectedAccount?.name
                : `${transactionsFilter.accounts.length.toLocaleString("fa-ir")} حساب`}
          </Capsule>
        </div>
      </div>

      <div className="flex-1">
        {showSkeleton ? (
          <div className="grid gap-4">
            <TransactionItemLoading />
            <TransactionItemLoading />
            <TransactionItemLoading />
            <TransactionItemLoading />
            <TransactionItemLoading />
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-10 h-full animate-fade-in">
            <Filter className="fill-secondary" height={75} width={75} />
            <Description>
              با فیلتر‌های انتخابی هیچ تراکنشی یافت نشد.
            </Description>

            {transactionsFilter.accounts.length > 0 ||
            transactionsFilter.categories.length > 0 ||
            transactionsFilter.tags.length > 0 ||
            transactionsFilter.timeWindow < 29 ? (
              <Button
                disabled={isChangingFilter}
                onClick={() => navigateWithLoading(pathname)}
              >
                حذف همه فیلتر‌ها
              </Button>
            ) : (
              <Button
                disabled={isChangingFilter}
                onClick={() => navigateWithLoading(`${pathname}?time=36500`)}
              >
                نمایش همه تراکنش‌ها
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 animate-fade-in">
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
                  <TransactionItem
                    transaction={transaction}
                    account={account}
                  />
                </SwipeableElement>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
