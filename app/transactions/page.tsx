/**
 * @fileoverview Transactions List Page
 *
 * Displays the user's transactions with three combinable filters (time
 * window, accounts, categories) exposed as chips at the top of the screen.
 * Each row is swipeable for edit / delete.
 *
 * ### Layout note — why the time dropdown is a sibling of the scroller
 *
 * The filter chips live inside a horizontally scrollable container
 * (`overflow-x-auto`). Per the CSS overflow spec, setting `overflow-x: auto`
 * while `overflow-y` is `visible` forces the browser to also treat
 * `overflow-y` as `auto`. If the time-window dropdown were rendered inside
 * that container, its absolutely-positioned panel (which extends below the
 * chip row) would fall into the vertical scroll area and be clipped —
 * looking like "the button does nothing".
 *
 * The fix is to render `TimeWindow` as a **sibling** of the scroll
 * container, wrapped by a `position: relative` parent that owns the
 * outside-click `dropdownRef`. This mirrors the original working layout.
 *
 * ### Performance note — why the list is memoized
 *
 * With many transactions (hundreds or thousands), re-rendering the whole
 * list on every parent render is expensive. Opening the time dropdown
 * re-renders this component (because `useTimeWindow` state lives here), so
 * the list is split into a memoized {@link TransactionsList} with stable
 * callbacks. Unrelated parent re-renders therefore skip the list entirely.
 *
 * @module app/transactions/page
 */

"use client";

import Capsule from "@/components/Capsule";
import NavbarTitle from "@/components/NavbarTitle";
import TransactionItem from "@/components/TransactionItem";
import TransactionItemLoading from "@/components/Skeletons/TransactionItemLoading";
import Left from "@/icons/Left";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_TIME_WINDOW,
  filterToUrl,
  parseStringArray,
  TransactionsFilterType,
} from "./methods";
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
import { useTimeFilterOptions } from "@/utility/shared/useTimeFilterOptions";

/**
 * Memoized transactions list, including its loading and empty states.
 *
 * Split out of {@link Transactions} so that re-renders of the parent for
 * reasons unrelated to the list (e.g. opening the time dropdown, scroll
 * restoration bookkeeping) do not force every `SwipeableElement` to
 * reconcile. All callbacks passed in are stabilized by the parent.
 */
const TransactionsList = memo(function TransactionsList({
  transactions,
  accounts,
  isLoading,
  swipedItem,
  dragCounter,
  hasActiveFilters,
  onOpenItem,
  onCloseOthers,
  onEdit,
  onDelete,
  onClearFilters,
  onShowAll,
}: {
  transactions: TransactionType[];
  accounts: AccountType[];
  isLoading: boolean;
  swipedItem: string | null;
  dragCounter: number;
  hasActiveFilters: boolean;
  onOpenItem: (id: string) => void;
  onCloseOthers: () => void;
  onEdit: (tx: TransactionType) => void;
  onDelete: (tx: TransactionType) => void;
  onClearFilters: () => void;
  onShowAll: () => void;
}) {
  // ─── Loading state ──────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="grid gap-4">
        <TransactionItemLoading />
        <TransactionItemLoading />
        <TransactionItemLoading />
        <TransactionItemLoading />
        <TransactionItemLoading />
      </div>
    );
  }

  // ─── Empty state ────────────────────────────────────────────
  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-10 h-full animate-fade-in">
        <Filter className="fill-secondary" height={75} width={75} />
        <Description>با فیلتر‌های انتخابی هیچ تراکنشی یافت نشد.</Description>
        {hasActiveFilters ? (
          <Button onClick={onClearFilters}>حذف همه فیلتر‌ها</Button>
        ) : (
          <Button onClick={onShowAll}>نمایش همه تراکنش‌ها</Button>
        )}
      </div>
    );
  }

  // ─── List ───────────────────────────────────────────────────
  return (
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
            key={transaction.id}
            isOpen={transaction.id === swipedItem}
            onOpenChange={() => onOpenItem(transaction.id)}
            onCloseOthers={onCloseOthers}
            cancelConfirmSignal={dragCounter}
            onEdit={() => onEdit(transaction)}
            onDelete={
              transaction.type !== "initial"
                ? () => onDelete(transaction)
                : undefined
            }
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
  );
});

/**
 * Route component for the transactions list page.
 *
 * @returns The rendered transactions screen.
 */
export default function Transactions() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { accountsStore, transactionsStore } = DatabaseStores;

  // ─── Read URL params as primitive strings ───────────────────
  // We depend on the string values (not the `searchParams` object) so
  // the memo below only recomputes when an actual value changes, not
  // when `searchParams` returns a fresh reference on every render.
  const timeParamStr = searchParams.get("time");
  const accountsParam = searchParams.get("accounts");
  const categoriesParam = searchParams.get("categories");
  const tagsParam = searchParams.get("tags");

  const [transactions, setTransactions] = useState<TransactionType[]>([]);
  const [accounts, setAccounts] = useState<AccountType[]>([]);
  const [swipedItem, setSwipedItem] = useState<string | null>(null);
  const [dragCounter, setDragCounter] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Time-window dropdown state lives here (parent) so that `dropdownRef`
  // can wrap the scroll container + dropdown, keeping the panel outside
  // the `overflow-x-auto` clipping context.
  const tw = useTimeWindow();
  const timeFilterOptions = useTimeFilterOptions();

  /** Parsed filter state, memoized on the primitive URL params. */
  const transactionsFilter: TransactionsFilterType = useMemo(() => {
    return {
      timeWindow: timeParamStr ? Number(timeParamStr) : DEFAULT_TIME_WINDOW,
      accounts: parseStringArray(accountsParam),
      categories: parseStringArray(categoriesParam),
      tags: parseStringArray(tagsParam),
    };
  }, [timeParamStr, accountsParam, categoriesParam, tagsParam]);

  /** Persian display name for the current time window. */
  const currentTimeFilterName = useMemo(
    () =>
      timeFilterOptions.find((o) => o.time === transactionsFilter.timeWindow)
        ?.name ?? "۳۰ روز گذشته",
    [transactionsFilter.timeWindow, timeFilterOptions],
  );

  /** `true` when at least one filter is narrower than the default view. */
  const hasActiveFilters = useMemo(
    () =>
      transactionsFilter.accounts.length > 0 ||
      transactionsFilter.categories.length > 0 ||
      transactionsFilter.tags.length > 0 ||
      transactionsFilter.timeWindow < DEFAULT_TIME_WINDOW,
    [transactionsFilter],
  );

  // ==================== Scroll Management ====================
  const SCROLL_KEY = useMemo(
    () => `transactions-scroll-${JSON.stringify(transactionsFilter)}`,
    [transactionsFilter],
  );

  const { clearSavedPosition } = useScrollRestoration(SCROLL_KEY, !isLoading);

  // ==================== Fetching Data ====================
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

  // ==================== Handlers ====================
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
      tw.close();
    },
    [transactionsFilter, router, clearSavedPosition, tw],
  );

  const handleOpenItem = useCallback((id: string) => {
    setSwipedItem(id);
  }, []);

  const handleCloseOthers = useCallback(() => {
    setSwipedItem(null);
    setDragCounter((c) => c + 1);
  }, []);

  const handleEditTransaction = useCallback(
    (tx: TransactionType) => {
      if (tx.type !== "initial") {
        router.push(`/transactions/edit?id=${tx.id}`);
      } else {
        router.push(`/accounts/edit?id=${tx.debit}`);
      }
    },
    [router],
  );

  const handleDeleteTransaction = useCallback(
    async (tx: TransactionType) => {
      await deleteItem(transactionsStore, tx.id);
      setTransactions((prev) => prev.filter((t) => t.id !== tx.id));
      setSwipedItem(null);
    },
    [transactionsStore],
  );

  const handleClearFilters = useCallback(() => {
    navigateWithLoading(pathname);
  }, [navigateWithLoading, pathname]);

  const handleShowAll = useCallback(() => {
    navigateWithLoading(`${pathname}?time=36500`);
  }, [navigateWithLoading, pathname]);

  // ==================== Derived: selected filter chips ====================
  const selectedAccount =
    transactionsFilter.accounts.length === 1
      ? accounts.find((item) => item.id === transactionsFilter.accounts[0])
      : undefined;

  const selectedCategory =
    transactionsFilter.categories.length === 1
      ? getCategoryById(transactionsFilter.categories[0])
      : undefined;

  return (
    <div className="py-7.5 flex flex-col gap-15 w-full overflow-hidden min-h-screen">
      <div className="grid gap-7.5 min-w-0">
        <div className="px-7.5">
          <NavbarTitle title="تراکنش‌ها" />
        </div>

        {/*
         * The wrapper below owns `dropdownRef` and is `position: relative`
         * so the time-window dropdown can be a **sibling** of the
         * horizontally-scrolling chip row. If it were a child of that row
         * it would be clipped by `overflow-x-auto` (whose `overflow-y`
         * is forced to `auto` by the CSS spec), and the menu would never
         * become visible.
         */}
        <div className="relative min-w-0" ref={tw.dropdownRef}>
          <div className="flex items-center px-7.5 gap-2 overflow-x-auto w-full min-w-0 scrollbar-none">
            <span className="me-2 shrink-0 text-nowrap">فیلترها</span>

            <Capsule
              Icon={Left}
              className="shrink-0 text-nowrap"
              primary={transactionsFilter.timeWindow !== DEFAULT_TIME_WINDOW}
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
              className={`shrink-0 text-nowrap ${
                selectedAccount
                  ? `${AccountColors[selectedAccount.color].border} ${AccountColors[selectedAccount.color].text} ${AccountColors[selectedAccount.color].surface}`
                  : ""
              }`}
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
              className={`shrink-0 text-nowrap ${
                selectedCategory
                  ? selectedCategory.id >= 0x03000000
                    ? "border-income-border text-income-primary bg-income-background"
                    : "border-expense-border text-expense-primary bg-expense-background"
                  : ""
              }`}
            >
              {transactionsFilter.categories.length === 0
                ? "همه دسته‌بندی‌ها"
                : transactionsFilter.categories.length === 1
                  ? (selectedCategory?.name ?? "دسته‌بندی")
                  : `${transactionsFilter.categories.length.toLocaleString("fa-ir")} دسته‌بندی`}
            </Capsule>
          </div>

          {/* Sibling of the scroller → not clipped by overflow-x-auto */}
          <TimeWindow
            isMounted={tw.isMounted}
            isVisible={tw.isVisible}
            options={timeFilterOptions}
            onSelect={handleTimeFilterChange}
            activeTime={transactionsFilter.timeWindow}
          />
        </div>
      </div>

      <div className="flex-1 px-7.5">
        <TransactionsList
          transactions={transactions}
          accounts={accounts}
          isLoading={isLoading}
          swipedItem={swipedItem}
          dragCounter={dragCounter}
          hasActiveFilters={hasActiveFilters}
          onOpenItem={handleOpenItem}
          onCloseOthers={handleCloseOthers}
          onEdit={handleEditTransaction}
          onDelete={handleDeleteTransaction}
          onClearFilters={handleClearFilters}
          onShowAll={handleShowAll}
        />
      </div>
    </div>
  );
}
