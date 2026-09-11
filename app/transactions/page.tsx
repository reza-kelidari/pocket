"use client";

import Capsule from "@/components/Capsule";
import NavbarTitle from "@/components/NavbarTitle";
import TransactionItem from "@/components/TransactionItem";
import TransactionItemLoading from "@/components/Skeletons/TransactionItemLoading";
import Left from "@/icons/Left";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { TransactionType } from "@/utility/shared/transactionTypes";
import { deleteItem, getAll } from "@/utility/db/Database";
import { DatabaseStores } from "@/utility/keys/database";
import SwipeableElement from "@/components/SwipeableElement";
import { useScrollRestoration } from "@/utility/shared/useScrollRestoration";
import TimeWindow from "@/components/TimeWindow";
import { useTimeWindow } from "@/utility/shared/useTimeWindow";
import { getCategoryById } from "@/utility/shared/transactionsMethods";

export default function Transactions() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { accountsStore, transactionsStore } = DatabaseStores;

  const [transactions, setTransactions] = useState<TransactionType[]>([]);
  const [accounts, setAccounts] = useState<AccountType[]>([]);
  const [swipedItem, setSwipedItem] = useState<string | null>(null);
  const [dragCounter, setDragCounter] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const tw = useTimeWindow();

  const timeFilterOptions = useMemo(
    () => timeFilters(toJalaliDateArray(new Date())),
    [],
  );

  const transactionsFilter: TransactionsFilterType = useMemo(() => {
    const timeParamStr = searchParams.get("time");
    return {
      timeWindow: timeParamStr ? Number(timeParamStr) : 30,
      accounts: parseStringArray(searchParams.get("accounts")),
      categories: parseStringArray(searchParams.get("categories")),
      tags: parseStringArray(searchParams.get("tags")),
    };
  }, [searchParams]);

  const currentTimeFilterName = useMemo(
    () =>
      timeFilterOptions.find((o) => o.time === transactionsFilter.timeWindow)
        ?.name ?? "۳۰ روز گذشته",
    [transactionsFilter.timeWindow, timeFilterOptions],
  );

  // ==================== مدیریت اسکرول ====================
  const SCROLL_KEY = useMemo(
    () => `transactions-scroll-${JSON.stringify(transactionsFilter)}`,
    [transactionsFilter],
  );

  const { clearSavedPosition } = useScrollRestoration(SCROLL_KEY, !isLoading);

  // ==================== دریافت دیتا ====================
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    (async () => {
      try {
        const qs = filterToUrl(transactionsFilter).replace("?", "");
        const [transactionsData, accountsData] = await Promise.all([
          getAll<TransactionType>(transactionsStore, qs),
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
  }, [accountsStore, transactionsStore, transactionsFilter]);

  // ==================== هندلرها ====================
  const navigateWithLoading = useCallback(
    (url: string) => {
      clearSavedPosition();
      window.scrollTo({ top: 0, behavior: "instant" });
      router.replace(url);
    },
    [router, clearSavedPosition],
  );

  const handleTimeFilterChange = useCallback(
    (time: number) => {
      clearSavedPosition();
      window.scrollTo({ top: 0, behavior: "instant" });
      const newFilter = { ...transactionsFilter, timeWindow: time };
      router.replace(`/transactions${filterToUrl(newFilter)}`);
      tw.close(); // ← به جای setShowTimeDropdown(false)
    },
    [transactionsFilter, router, clearSavedPosition, tw],
  );

  const selectedAccount =
    transactionsFilter.accounts.length === 1
      ? accounts.find((item) => item.id === transactionsFilter.accounts[0])
      : undefined;

  const selectedCategory =
    transactionsFilter.categories.length === 1
      ? getCategoryById(transactionsFilter.categories[0])
      : undefined;

  return (
    <div className="p-7.5 flex flex-col gap-15 w-screen overflow-hidden min-h-screen">
      <div className="grid gap-7.5">
        <NavbarTitle title="تراکنش‌ها" />

        <div className="relative" ref={tw.dropdownRef}>
          <div className="flex items-center gap-2 overflow-x-scroll scroll-auto w-full scrollbar-none">
            <span className="me-2">فیلترها</span>

            <Capsule
              Icon={Left}
              primary={transactionsFilter.timeWindow !== 29}
              onClick={tw.toggle}
            >
              {currentTimeFilterName}
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

            <Capsule
              Icon={Left}
              href={`/transactions/filter-category${filterToUrl(transactionsFilter)}`}
              replace
              primary={transactionsFilter.categories.length > 0}
              className={
                selectedCategory
                  ? selectedCategory.id >= 0x03000000
                    ? "border-income-border text-income-primary bg-income-background"
                    : "border-expense-border text-expense-primary bg-expense-background"
                  : ""
              }
            >
              {transactionsFilter.categories.length === 0
                ? "همه دسته‌بندی‌ها"
                : transactionsFilter.categories.length === 1
                  ? (selectedCategory?.name ?? "دسته‌بندی")
                  : `${transactionsFilter.categories.length.toLocaleString("fa-ir")} دسته‌بندی`}
            </Capsule>
          </div>

          <TimeWindow
            isMounted={tw.isMounted}
            isVisible={tw.isVisible}
            options={timeFilterOptions}
            onSelect={handleTimeFilterChange}
            activeTime={transactionsFilter.timeWindow}
          />
        </div>
      </div>

      <div className="flex-1">
        {isLoading ? (
          <div className="grid gap-4">
            <TransactionItemLoading />
            <TransactionItemLoading />
            <TransactionItemLoading />
            <TransactionItemLoading />
            <TransactionItemLoading />
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-10 h-full animate-fade-in">
            <Filter className="fill-secondary" height={75} width={75} />
            <Description>
              با فیلتر‌های انتخابی هیچ تراکنشی یافت نشد.
            </Description>
            {transactionsFilter.accounts.length > 0 ||
            transactionsFilter.categories.length > 0 ||
            transactionsFilter.tags.length > 0 ||
            transactionsFilter.timeWindow < 29 ? (
              <Button onClick={() => navigateWithLoading(pathname)}>
                حذف همه فیلتر‌ها
              </Button>
            ) : (
              <Button
                onClick={() => navigateWithLoading(`${pathname}?time=36500`)}
              >
                نمایش همه تراکنش‌ها
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 animate-fade-in">
            {transactions.map((transaction) => {
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
                  onCloseOthers={() => {
                    setSwipedItem(null);
                    setDragCounter((c) => c + 1);
                  }}
                  cancelConfirmSignal={dragCounter}
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
                  confirmDelete
                >
                  <TransactionItem
                    transaction={transaction}
                    account={account}
                    accounts={accounts}
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
