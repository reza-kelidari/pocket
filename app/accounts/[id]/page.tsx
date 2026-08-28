/**
 * @fileoverview Account Details Page
 *
 * Displays comprehensive details for a specific account, including:
 * - Account metadata and an edit action.
 * - Balance history chart.
 * - For "Book" accounts: Tag-wise balance breakdown (default view).
 * - Transaction ledger with time-based filtering (when a tag is selected or non-Book account).
 * - Swipe actions for editing and deleting transactions.
 *
 * Route: `/accounts/[id]`
 *
 * URL Parameters:
 * - `time` (number): Time filter for the ledger (in days). Default: 29.
 * - `tag` (string): When present on a Book account, shows the ledger filtered
 *   by this tag. Use `"untagged"` for transactions without a tag.
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
import TagBalanceItem from "@/components/TagBalanceItem";
import TransactionItem from "@/components/TransactionItem";
import TransactionItemLoading from "@/components/TransactionItemLoading";
import TimeWindow from "@/components/TimeWindow";
import { useTimeWindow } from "@/utility/shared/useTimeWindow";
import { AccountType } from "@/utility/accounts/types";
import useBalances from "@/utility/balance/service/useBalances";
import { deleteItem, getAll, getItem } from "@/utility/db/Database";
import { DatabaseStores } from "@/utility/keys/database";
import { getAccountBalances } from "@/utility/shared/balancesMethods";
import { PrimaryColors, AccountColors } from "@/utility/shared/colors";
import { TransactionType } from "@/utility/shared/transactionTypes";
import { TagType } from "@/utility/shared/tagTypes";
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
 * Represents a single tag balance entry for the Book account breakdown view.
 */
interface TagBalanceEntry {
  /** The tag's unique identifier, or `"__untagged__"` for untagged transactions. */
  tagId: string;
  /** Display name of the tag. */
  tagName: string;
  /** The calculated net balance for all transactions with this tag. */
  balance: number;
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
 * the account's metadata, a balance history chart, and either a tag-wise balance
 * breakdown (for Book accounts) or a filterable ledger of transactions.
 *
 * Features:
 * - Unwraps dynamic route `id` parameter using React 19's `use` hook.
 * - Fetches account data, all accounts, all transactions, and all tags from the local database.
 * - For Book accounts without a `tag` param: displays tag-wise balance breakdown.
 * - For Book accounts with a `tag` param: displays filtered ledger with running balance.
 * - For non-Book accounts: displays the full ledger with time filtering.
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
  const { accountsStore, transactionsStore, tagsStore } = DatabaseStores;

  /** Time filter parameter from the URL (default: 30 days). */
  const timeParam = searchParams.get("time");
  /** Tag filter parameter from the URL. Present when viewing a specific tag's ledger. */
  const tagParam = searchParams.get("tag");
  /** Initial time filter value parsed from URL or defaulted to 30 days. */
  const initialTimeFilter = timeParam ? Number(timeParam) : 30;

  // --- Core Data States ---
  /** The currently viewed account object. */
  const [account, setAccount] = useState<AccountType>();
  /** All user accounts (needed for transfer name resolution). */
  const [accounts, setAccounts] = useState<AccountType[]>([]);
  /** All user transactions (used for tag balance calculation). */
  const [allTransactions, setAllTransactions] = useState<TransactionType[]>([]);
  /** All user tags (needed for tag name resolution). */
  const [allTags, setAllTags] = useState<TagType[]>([]);
  /** Whether the initial data load is in progress. */
  const [isLoading, setIsLoading] = useState(true);

  // --- Ledger & Filter States ---
  /** The fetched ledger data (transactions with running balance). */
  const [ledgerData, setLedgerData] = useState<LedgerResponse | null>(null);
  /** Whether the ledger fetch is in progress. */
  const [isLedgerLoading, setIsLedgerLoading] = useState(true);
  /** Currently active time filter value (in days). */
  const [timeFilter, setTimeFilter] = useState<number>(initialTimeFilter);

  // --- UI & Interaction States ---
  const tw = useTimeWindow();

  /** ID of the currently swiped-open transaction item. */
  const [swipedItem, setSwipedItem] = useState<string | null>(null);
  /** Counter to signal swipeable elements to close. */
  const [dragCounter, setDragCounter] = useState(0);
  /** Balance state management hook. */
  const { setBalances } = useBalances();

  /** Tracks component mount state to prevent state updates after unmount. */
  const isMountedRef = useRef(true);

  /** Scroll restoration key, includes tag param for independent scroll positions. */
  const SCROLL_KEY = `account-details-scroll-${accountID}-${timeFilter}-${tagParam}`;

  // ==================== Derived State ====================

  /** Whether the current account is of type "Book". */
  const isBookAccount = account?.type === "Book";

  /**
   * Determines if we're showing the tag breakdown view.
   * True when the account is a Book AND no specific tag is selected.
   */
  const isViewingTagBreakdown = isBookAccount && !tagParam;

  /**
   * Determines if we're showing the ledger view.
   * True for non-Book accounts, or Book accounts with a tag selected.
   */
  const isViewingLedger = !isBookAccount || !!tagParam;

  /** Pre-calculated time filter options based on the current Jalali date. */
  const timeFilterOptions = useMemo(
    () => timeFilters(toJalaliDateArray(new Date())),
    [],
  );

  // ==================== Lifecycle Effects ====================

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
   * Redirects the user to the main accounts list if the dynamic route `id` is missing or invalid.
   */
  useEffect(() => {
    if (!accountID) router.replace("/accounts");
  }, [accountID, router]);

  /**
   * Fetches the core account data, all accounts, all transactions, and all tags
   * from the local database when the component mounts or the account ID changes.
   */
  useEffect(() => {
    if (!accountID) return;
    (async () => {
      setIsLoading(true);
      const [acc, accs, txs, tags] = await Promise.all([
        getItem<AccountType>(accountsStore, accountID),
        getAll<AccountType>(accountsStore),
        getAll<TransactionType>(transactionsStore),
        getAll<TagType>(tagsStore),
      ]);
      if (!isMountedRef.current) return;
      setAccount(acc);
      setAccounts(accs);
      setAllTransactions(txs);
      setAllTags(tags);
      setIsLoading(false);
    })();
  }, [accountID, accountsStore, transactionsStore, tagsStore]);

  /**
   * Fetches the transaction ledger for the current account and selected time/tag filter.
   * Only fetches when viewing the ledger (not the tag breakdown).
   * Handles loading states, API errors, and unauthorized redirects.
   */
  const fetchLedger = useCallback(async () => {
    if (!accountID || isViewingTagBreakdown) return;
    setIsLedgerLoading(true);
    try {
      let url = `/api/accounts/${accountID}/ledger?time=${timeFilter}`;
      if (tagParam) {
        url += `&tag=${tagParam}`;
      }
      const res = await fetch(url);
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
  }, [accountID, timeFilter, tagParam, router, isViewingTagBreakdown]);

  /**
   * Triggers the ledger fetch operation whenever the `fetchLedger` callback changes
   * (which occurs when `accountID`, `timeFilter`, or `tagParam` changes).
   */
  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  // ==================== Tag Balance Calculation ====================

  /**
   * Calculates the balance breakdown by tag for Book-type accounts.
   */
  const tagBalances: TagBalanceEntry[] = useMemo(() => {
    if (!isBookAccount || !accountID) return [];

    const accountTxs = allTransactions.filter(
      (tx) => tx.debit === accountID || tx.credit === accountID,
    );

    const tagMap = new Map<string, number>();

    for (const tx of accountTxs) {
      const tagKey = tx.tag || "__untagged__";
      const signedValue = tx.debit === accountID ? tx.value : -tx.value;
      tagMap.set(tagKey, (tagMap.get(tagKey) || 0) + signedValue);
    }

    const results: TagBalanceEntry[] = [];

    if (tagMap.has("__untagged__")) {
      results.push({
        tagId: "__untagged__",
        tagName: "بدون برچسب",
        balance: tagMap.get("__untagged__") || 0,
      });
    }

    for (const [tagId, balance] of tagMap.entries()) {
      if (tagId === "__untagged__") continue;
      const tag = allTags.find((t) => t.id === tagId);
      results.push({
        tagId,
        tagName: tag?.name || "برچسب ناشناخته",
        balance,
      });
    }

    results.sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));

    return results;
  }, [allTransactions, allTags, accountID, isBookAccount]);

  // ==================== Scroll Restoration ====================

  /** Whether the page has fully loaded all required data. */
  const isPageReady =
    !isLoading && (!isViewingLedger || (!isLedgerLoading && !!ledgerData));

  /** Scroll restoration hook for preserving scroll position across navigations. */
  const { clearSavedPosition } = useScrollRestoration(SCROLL_KEY, isPageReady);

  /**
   * Listens for browser history navigation events (`popstate`).
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

  // ==================== Event Handlers ====================

  /**
   * Handles the deletion of a transaction.
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
   */
  const handleTimeFilterChange = useCallback(
    (time: number) => {
      setTimeFilter(time);
      tw.close();
      const urlParams = new URLSearchParams(searchParams.toString());
      urlParams.set("time", String(time));
      clearSavedPosition();
      window.scrollTo({ top: 0, behavior: "instant" });
      router.replace(`/accounts/${accountID}?${urlParams.toString()}`, {
        scroll: false,
      });
    },
    [searchParams, router, accountID, clearSavedPosition, tw],
  );

  /**
   * Navigates back to the tag breakdown view by removing the `tag` search param.
   */
  const handleBackToTagBreakdown = useCallback(() => {
    const urlParams = new URLSearchParams(searchParams.toString());
    urlParams.delete("tag");
    router.replace(`/accounts/${accountID}?${urlParams.toString()}`, {
      scroll: false,
    });
  }, [searchParams, router, accountID]);

  // ==================== Derived Display Values ====================

  /** Resolves the display name for the currently active time filter. */
  const currentTimeFilterName = useMemo(
    () =>
      timeFilterOptions.find((o) => o.time === timeFilter)?.name ??
      "۳۰ روز گذشته",
    [timeFilter, timeFilterOptions],
  );

  /**
   * Resolves the display name of the currently selected tag.
   */
  const currentTagName = useMemo(() => {
    if (!tagParam || tagParam === "untagged") return "بدون برچسب";
    const tag = allTags.find((t) => t.id === tagParam);
    return tag?.name || "برچسب";
  }, [tagParam, allTags]);

  // ==================== Render ====================

  if (!accountID) return null;

  /** Resolves the account's color classes for consistent theming. */
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
            />
          </div>
        )}
      </div>

      {isViewingTagBreakdown && (
        <div className="flex flex-col gap-8">
          {isLoading ? (
            <div className="h-6 w-40 bg-elements-border rounded-md animate-pulse"></div>
          ) : (
            <SectionTitle>{`مانده‌ی برچسب‌های ${account?.name}`}</SectionTitle>
          )}

          {isLoading ? (
            <div className="flex flex-col w-full gap-4">
              {[0, 1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-14 w-full bg-elements-background border border-elements-border rounded-2xl animate-pulse"
                ></div>
              ))}
            </div>
          ) : tagBalances.length > 0 ? (
            <div className="flex flex-col w-full gap-4 animate-fade-in">
              {tagBalances.map((item) => (
                <TagBalanceItem
                  key={item.tagId}
                  tagName={item.tagName}
                  balance={item.balance}
                  accountColor={account?.color ?? "black"}
                  accountId={accountID}
                  tagId={item.tagId}
                />
              ))}
            </div>
          ) : (
            <div className="text-center text-xs text-secondary py-8">
              هیچ تراکنشی برای این حساب ثبت نشده است.
            </div>
          )}
        </div>
      )}

      {isViewingLedger && (
        <div className="flex flex-col gap-8">
          {isLoading ? (
            <div className="h-6 w-40 bg-elements-border rounded-md animate-pulse"></div>
          ) : (
            <SectionTitle
              action={
                <div className="flex items-center gap-2">
                  {isBookAccount && tagParam && (
                    <button
                      type="button"
                      onClick={handleBackToTagBreakdown}
                      className={`border px-2.5 py-2 rounded-4xl text-xs flex items-center gap-1 text-nowrap cursor-pointer bg-elements-background border-elements-border text-black`}
                    >
                      بازگشت
                    </button>
                  )}

                  <div className="relative" ref={tw.dropdownRef}>
                    <button
                      type="button"
                      onClick={tw.toggle}
                      className={`border px-2.5 py-2 rounded-4xl text-xs flex items-center gap-1 text-nowrap cursor-pointer ${accountColor.surface} ${accountColor.border} ${accountColor.text}`}
                    >
                      {currentTimeFilterName}
                      <Left height={15} width={15} className="fill-current" />
                    </button>

                    <TimeWindow
                      isMounted={tw.isMounted}
                      isVisible={tw.isVisible}
                      options={timeFilterOptions}
                      onSelect={handleTimeFilterChange}
                      activeTime={timeFilter}
                      align="left"
                    />
                  </div>
                </div>
              }
            >
              {isBookAccount && tagParam
                ? `گردش ${currentTagName}`
                : `گردش حساب ${account?.name}`}
            </SectionTitle>
          )}

          {isLedgerLoading || isLoading ? (
            <div className="flex flex-col w-full gap-4">
              {[0, 1, 2, 3, 4].map((item) => (
                <TransactionItemLoading key={item} />
              ))}
            </div>
          ) : ledgerData && ledgerData.transactions.length > 0 ? (
            <div className="flex flex-col w-full gap-4 animate-fade-in">
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
      )}
    </div>
  );
}
