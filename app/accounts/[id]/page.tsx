/**
 * @fileoverview Account Details Page
 *
 * Displays comprehensive details for a specific account, including:
 * - Account metadata and an edit action.
 * - Balance history chart.
 * - Transaction ledger with time-based filtering.
 * - Swipe actions for editing and deleting transactions.
 *
 * Route: `/accounts/[id]`
 */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState, use } from "react";
import Capsule from "@/components/Capsule";
import CapsuleLoading from "@/components/CapsuleLoading";
import ChartView from "@/components/ChartContainer";
import ChartContainerLoading from "@/components/ChartContainerLoading";
import NavbarTitle from "@/components/NavbarTitle";
import SectionTitle from "@/components/SectionTitle";
import SwipeableElement from "@/components/SwipeableElement";
import TransactionItem from "@/components/TransactionItem";
import TransactionItemLoading from "@/components/TransactionItemLoading";
import { AccountType } from "@/utility/accounts/types";
import useBalances from "@/utility/balance/service/useBalances";
import { deleteItem, getAll, getItem } from "@/utility/db/Database";
import { DatabaseStores } from "@/utility/keys/database";
import { getAccountBalances } from "@/utility/shared/balancesMethods";
import { PrimaryColors, AccountColors } from "@/utility/shared/colors";
import { TransactionType } from "@/utility/shared/transactionTypes";
import { timeFilters } from "@/app/transactions/methods";
import { toJalaliDateArray } from "@/utility/shared/timeMethods";
import { useRouter, useSearchParams } from "next/navigation";
import { useScrollRestoration } from "@/utility/shared/useScrollRestoration";
import Pen from "@/icons/Pen";
import Left from "@/icons/Left";

/**
 * Represents a single transaction within the ledger response,
 * including the calculated account balance immediately after the transaction.
 */
type LedgerTransaction = TransactionType & { balanceAfter: number };

/**
 * Shape of the response returned by the `/api/accounts/[id]/ledger` endpoint.
 * Contains the starting balance for the selected time period and the list of transactions.
 */
interface LedgerResponse {
  /** The account balance before the first transaction in the selected time window. */
  balanceBefore: number;
  /** Chronological list of transactions with their resulting balances. */
  transactions: LedgerTransaction[];
}

/**
 * Props for the AccountsDetails page component.
 */
interface AccountsDetailsProps {
  /**
   * Next.js dynamic route parameters.
   * In Next.js 15+ / React 19, `params` is a Promise that must be unwrapped using React's `use` hook.
   */
  params: Promise<{ id: string }>;
}

/**
 * `AccountsDetails` Component
 *
 * Renders the detailed view for a specific financial account. It fetches and displays
 * the account's metadata, a balance history chart, and a filterable ledger of transactions.
 *
 * Features:
 * - Unwraps dynamic route `id` parameter using React 19's `use` hook.
 * - Fetches account data and global transactions from the local database.
 * - Fetches time-filtered ledger data from a dedicated API endpoint.
 * - Manages dropdown UI for time filtering with smooth mount/unmount animations.
 * - Handles transaction deletion with local state synchronization and balance recalculation.
 * - Implements scroll restoration and cleanup on navigation.
 *
 * @param props - Component props containing Next.js route parameters.
 * @returns The rendered account details UI, or `null` if the account ID is missing.
 */
export default function AccountsDetails({ params }: AccountsDetailsProps) {
  // Unwrap the Promise-based params using React 19's `use` hook
  const { id: accountID } = use(params);

  const searchParams = useSearchParams();
  const router = useRouter();
  const { accountsStore, transactionsStore } = DatabaseStores;

  const timeParam = searchParams.get("time");
  const initialTimeFilter = timeParam ? Number(timeParam) : 29;

  // --- Core Data States ---
  const [account, setAccount] = useState<AccountType>();
  const [accounts, setAccounts] = useState<AccountType[]>([]);
  const [allTransactions, setAllTransactions] = useState<TransactionType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- Ledger & Filter States ---
  const [ledgerData, setLedgerData] = useState<LedgerResponse | null>(null);
  const [isLedgerLoading, setIsLedgerLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<number>(initialTimeFilter);

  // --- UI & Interaction States ---
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const [isDropdownMounted, setIsDropdownMounted] = useState(false);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [swipedItem, setSwipedItem] = useState<string | null>(null);
  const [dragCounter, setDragCounter] = useState(0);

  const { setBalances } = useBalances();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);

  const SCROLL_KEY = `account-details-scroll-${accountID}-${timeFilter}`;

  /** Pre-calculated time filter options based on the current Jalali date. */
  const timeFilterOptions = useMemo(
    () => timeFilters(toJalaliDateArray(new Date())),
    [],
  );

  /**
   * Tracks the mounted state of the component to prevent state updates
   * on unmounted components during asynchronous operations.
   */
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /**
   * Synchronizes the local `timeFilter` state with the URL search parameters.
   * Ensures the UI reflects the correct time window if the URL is modified externally
   * (e.g., via browser back/forward buttons).
   */
  useEffect(() => {
    const t = searchParams.get("time");
    const newTime = t ? Number(t) : 29;
    if (newTime !== timeFilter) {
      setTimeFilter(newTime);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  /**
   * Manages the mount/unmount lifecycle and CSS transitions for the time filter dropdown.
   * Applies a slight delay to allow CSS transitions to execute smoothly before unmounting.
   */
  useEffect(() => {
    if (showTimeDropdown) {
      setIsDropdownMounted(true);
      const timer = setTimeout(() => setIsDropdownVisible(true), 15);
      return () => clearTimeout(timer);
    } else {
      setIsDropdownVisible(false);
      const timer = setTimeout(() => setIsDropdownMounted(false), 200);
      return () => clearTimeout(timer);
    }
  }, [showTimeDropdown]);

  /**
   * Adds a global click listener to close the time filter dropdown
   * when the user clicks outside of the dropdown container.
   */
  useEffect(() => {
    if (!showTimeDropdown) return;
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowTimeDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showTimeDropdown]);

  /**
   * Redirects the user to the main accounts list if the dynamic route `id` is missing or invalid.
   */
  useEffect(() => {
    if (!accountID) router.replace("/accounts");
  }, [accountID, router]);

  /**
   * Fetches the core account data, all accounts, and all transactions
   * from the local database when the component mounts or the account ID changes.
   */
  useEffect(() => {
    if (!accountID) return;
    (async () => {
      setIsLoading(true);
      const [acc, accs, txs] = await Promise.all([
        getItem<AccountType>(accountsStore, accountID),
        getAll<AccountType>(accountsStore),
        getAll<TransactionType>(transactionsStore),
      ]);
      if (!isMountedRef.current) return;
      setAccount(acc);
      setAccounts(accs);
      setAllTransactions(txs);
      setIsLoading(false);
    })();
  }, [accountID, accountsStore, transactionsStore]);

  /**
   * Fetches the transaction ledger for the current account and selected time filter.
   * Handles loading states, API errors, and unauthorized redirects.
   */
  const fetchLedger = useCallback(async () => {
    if (!accountID) return;
    setIsLedgerLoading(true);
    try {
      const res = await fetch(
        `/api/accounts/${accountID}/ledger?time=${timeFilter}`,
      );
      if (!isMountedRef.current) return;

      if (res.status === 401) {
        router.replace("/splash");
        return;
      }
      if (!res.ok) throw new Error("Ledger fetch failed");
      const data: LedgerResponse = await res.json();
      if (isMountedRef.current) setLedgerData(data);
    } catch (err) {
      console.error("Failed to fetch ledger:", err);
    } finally {
      if (isMountedRef.current) setIsLedgerLoading(false);
    }
  }, [accountID, timeFilter, router]);

  /**
   * Triggers the ledger fetch operation whenever the `fetchLedger` callback changes
   * (which occurs when `accountID` or `timeFilter` changes).
   */
  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  const isPageReady = !isLoading && !isLedgerLoading && !!ledgerData;
  const { clearSavedPosition } = useScrollRestoration(SCROLL_KEY, isPageReady);

  /**
   * Listens for browser history navigation events (`popstate`).
   * Clears saved scroll positions when navigating away from the details page,
   * and refetches the ledger when returning to it.
   */
  useEffect(() => {
    const handlePopState = () => {
      const isOnDetailsPage =
        window.location.pathname === `/accounts/${accountID}`;

      if (!isOnDetailsPage) {
        clearSavedPosition();
      } else {
        fetchLedger();
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [fetchLedger, clearSavedPosition, accountID]);

  /**
   * Handles the deletion of a transaction.
   * Removes the transaction from the local database, updates the global transactions state,
   * recalculates account balances, and refetches the ledger to reflect the changes.
   *
   * @param txId - The unique identifier of the transaction to delete.
   */
  const handleDeleteTransaction = async (txId: string) => {
    await deleteItem(transactionsStore, txId);
    const newTxs = allTransactions.filter((t) => t.id !== txId);
    setAllTransactions(newTxs);
    setBalances(getAccountBalances(accounts, newTxs));
    setSwipedItem(null);
    fetchLedger();
  };

  /**
   * Handles changes to the time filter dropdown.
   * Updates the local state, modifies the URL search parameters without reloading the page,
   * resets the scroll position, and clears any saved scroll restoration data.
   *
   * @param time - The new time filter value (in days).
   */
  const handleTimeFilterChange = useCallback(
    (time: number) => {
      setTimeFilter(time);
      setShowTimeDropdown(false);

      const urlParams = new URLSearchParams(searchParams.toString());
      urlParams.set("time", String(time));

      clearSavedPosition();
      window.scrollTo({ top: 0, behavior: "instant" });

      router.replace(`/accounts/${accountID}?${urlParams.toString()}`, {
        scroll: false,
      });
    },
    [searchParams, router, accountID, clearSavedPosition],
  );

  /** Resolves the display name for the currently active time filter. */
  const currentTimeFilterName = useMemo(
    () =>
      timeFilterOptions.find((o) => o.time === timeFilter)?.name ??
      "۳۰ روز گذشته",
    [timeFilter, timeFilterOptions],
  );

  if (!accountID) return null;

  const accountColor = AccountColors[account?.color ?? "black"];

  return (
    <div className="p-7.5 flex flex-col gap-15 w-full max-w-full min-w-0 overflow-x-hidden min-h-screen">
      <div className="flex flex-col gap-15 w-full min-w-0">
        <NavbarTitle
          title={isLoading ? "جزئیات حساب" : (account?.name ?? "")}
          onClick={clearSavedPosition}
        >
          {isLoading ? (
            <CapsuleLoading />
          ) : (
            <Capsule
              Icon={Pen}
              href={`/accounts/edit?id=${account?.id}`}
              className={`${PrimaryColors.secondary.box} animate-fade-in`}
            >
              اصلاح حساب
            </Capsule>
          )}
        </NavbarTitle>

        {isLoading ? (
          <ChartContainerLoading />
        ) : (
          <div className="animate-fade-in">
            <ChartView
              title={`موجودی ${account?.name}`}
              color={account?.color}
              timeSelector
              accountID={account?.id}
              transactions={allTransactions}
            />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-5">
        {isLoading ? (
          <div className="h-6 w-40 bg-elements-border rounded-md animate-pulse"></div>
        ) : (
          <SectionTitle
            action={
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowTimeDropdown((v) => !v)}
                  className={`border px-2.5 py-2 rounded-4xl text-xs flex items-center gap-1 text-nowrap ${accountColor.surface} ${accountColor.border} ${accountColor.text} cursor-pointer`}
                >
                  {currentTimeFilterName}
                  <Left height={15} width={15} className="fill-current" />
                </button>

                {isDropdownMounted && (
                  <div
                    className={`absolute top-full left-0 mt-2 p-2 flex flex-col gap-1 bg-white border border-elements-border rounded-2xl shadow-lg z-50 min-w-36 transition-all duration-200 ease-out transform origin-top-left ${
                      isDropdownVisible
                        ? "opacity-100 translate-y-0 scale-100"
                        : "opacity-0 -translate-y-2 scale-95 pointer-events-none"
                    }`}
                  >
                    {timeFilterOptions.map((option) => (
                      <button
                        key={option.time}
                        type="button"
                        onClick={() => handleTimeFilterChange(option.time)}
                        className={`block w-full text-right px-4 rounded-md py-2.5 text-xs transition-colors ${
                          option.time === timeFilter
                            ? `${accountColor.text} font-bold ${accountColor.surface}`
                            : "text-black hover:bg-elements-background"
                        }`}
                      >
                        {option.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            }
          >
            {`گردش حساب ${account?.name}`}
          </SectionTitle>
        )}

        {isLedgerLoading || isLoading ? (
          <div className="flex flex-col w-full gap-2.5">
            {[0, 1, 2, 3, 4].map((item) => (
              <TransactionItemLoading key={item} />
            ))}
          </div>
        ) : ledgerData && ledgerData.transactions.length > 0 ? (
          <div className="flex flex-col w-full gap-2.5 animate-fade-in">
            {ledgerData.transactions.map((transaction) => (
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
                    : router.push(`/accounts/edit?id=${account?.id}`)
                }
                onDelete={
                  transaction.type !== "initial"
                    ? () => handleDeleteTransaction(transaction.id)
                    : undefined
                }
                key={transaction.id}
                confirmDelete
              >
                <TransactionItem
                  account={account!}
                  transaction={transaction}
                  accounts={accounts}
                  balanceAfter={transaction.balanceAfter}
                />
              </SwipeableElement>
            ))}

            <div className="flex items-center justify-between px-2 pt-3 border-t border-elements-border">
              <span className="text-[9px] text-secondary">
                موجودی ابتدای دوره
              </span>
              <span className="text-xs font-medium text-secondary">
                {ledgerData.balanceBefore.toLocaleString("fa-ir")} ﷼
              </span>
            </div>
          </div>
        ) : !isLedgerLoading ? (
          <div className="text-center text-xs text-secondary py-8">
            در این بازه زمانی تراکنشی ثبت نشده است.
          </div>
        ) : null}
      </div>
    </div>
  );
}
