/**
 * @fileoverview Account Details Page
 *
 * Displays comprehensive details for a specific account:
 * - Account metadata + edit action.
 * - Balance history chart (server-computed).
 * - For "Book" accounts: tag-wise balance breakdown (server-computed).
 * - Transaction ledger (server-computed) with time-based filtering.
 * - Swipe actions for editing/deleting transactions.
 *
 * Route: `/accounts/[id]`
 *
 * URL params:
 * - `time` (number): shared time window for chart AND ledger. Default: 29.
 * - `tag` (string): when present on a Book account, shows the ledger for
 *   that tag. Use `"untagged"` for transactions without a tag.
 *
 * The time filter is shared between the chart and the ledger so the chart
 * never has an independent window.
 */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState, use } from "react";
import Capsule from "@/components/Capsule";
import CapsuleLoading from "@/components/Skeletons/CapsuleLoading";
import ChartView from "@/components/ChartContainer";
import ChartContainerLoading from "@/components/Skeletons/ChartContainerLoading";
import NavbarTitle from "@/components/NavbarTitle";
import SectionTitle from "@/components/SectionTitle";
import SwipeableElement from "@/components/SwipeableElement";
import TagBalanceItem from "@/components/TagBalanceItem";
import TransactionItem from "@/components/TransactionItem";
import TransactionItemLoading from "@/components/Skeletons/TransactionItemLoading";
import TimeWindow from "@/components/TimeWindow";
import { useTimeWindow } from "@/utility/shared/useTimeWindow";
import { AccountType } from "@/utility/accounts/types";
import { TagType } from "@/utility/shared/tagTypes";
import {
  deleteItem,
  getAll,
  getBalances,
  getItem,
} from "@/utility/db/Database";
import { DatabaseStores } from "@/utility/keys/database";
import { TransactionType } from "@/utility/shared/transactionTypes";
import { DEFAULT_TIME_WINDOW } from "@/app/transactions/methods";
import { useRouter, useSearchParams } from "next/navigation";
import { useScrollRestoration } from "@/utility/shared/useScrollRestoration";
import Pen from "@/icons/Pen";
import Left from "@/icons/Left";
import { useTimeFilterOptions } from "@/utility/shared/useTimeFilterOptions";
import useBalances from "@/utility/balance/service/useBalances";
import { AccountColors, PrimaryColors } from "@/utility/shared/colors";

type LedgerTransaction = TransactionType & { balanceAfter: number };

interface LedgerResponse {
  balanceBefore: number;
  transactions: LedgerTransaction[];
}

interface TagBalanceEntry {
  tagId: string;
  tagName: string;
  balance: number;
}

interface AccountsDetailsProps {
  params: Promise<{ id: string }>;
}

export default function AccountsDetails({ params }: AccountsDetailsProps) {
  const { id: accountID } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { accountsStore } = DatabaseStores;

  const timeParam = searchParams.get("time");
  const tagParam = searchParams.get("tag");
  const initialTimeFilter = timeParam ? Number(timeParam) : DEFAULT_TIME_WINDOW;

  // ─── Core data ─────────────────────────────────────────────
  const [account, setAccount] = useState<AccountType>();
  const [accounts, setAccounts] = useState<AccountType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ─── Tag balances (Book accounts only) ─────────────────────
  const [tagBalances, setTagBalances] = useState<TagBalanceEntry[]>([]);
  const [isTagBalancesLoading, setIsTagBalancesLoading] = useState(false);

  // ─── Ledger ────────────────────────────────────────────────
  const [ledgerData, setLedgerData] = useState<LedgerResponse | null>(null);
  const [isLedgerLoading, setIsLedgerLoading] = useState(false);

  // ─── Time filter (shared between chart and ledger) ─────────
  const [timeFilter, setTimeFilter] = useState<number>(initialTimeFilter);

  // ─── Tag name (for "گردش <tag>") ───────────────────────────
  const [tagName, setTagName] = useState<string>("");

  // ─── UI state ──────────────────────────────────────────────
  const tw = useTimeWindow();
  const timeFilterOptions = useTimeFilterOptions();
  const { setBalances } = useBalances();

  const [swipedItem, setSwipedItem] = useState<string | null>(null);
  const [dragCounter, setDragCounter] = useState(0);

  const isMountedRef = useRef(true);

  const SCROLL_KEY = `account-details-scroll-${accountID}-${timeFilter}-${tagParam}`;

  // ─── Derived ───────────────────────────────────────────────
  const isBookAccount = account?.type === "Book";
  const isViewingTagBreakdown = isBookAccount && !tagParam;
  const isViewingLedger = !isBookAccount || !!tagParam;

  // ─── Mount tracking ────────────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ─── Sync local timeFilter with URL ────────────────────────
  useEffect(() => {
    const t = searchParams.get("time");
    const newTime = t ? Number(t) : DEFAULT_TIME_WINDOW;
    if (newTime !== timeFilter) setTimeFilter(newTime);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // ─── Redirect if no accountID ──────────────────────────────
  useEffect(() => {
    if (!accountID) router.replace("/accounts");
  }, [accountID, router]);

  // ─── Fetch account + all accounts (for transfer name resolution) ─
  useEffect(() => {
    if (!accountID) return;
    (async () => {
      setIsLoading(true);
      const [acc, accs] = await Promise.all([
        getItem<AccountType>(accountsStore, accountID),
        getAll<AccountType>(accountsStore),
      ]);
      if (!isMountedRef.current) return;
      setAccount(acc);
      setAccounts(accs);
      setIsLoading(false);
    })();
  }, [accountID, accountsStore]);

  // ─── Fetch current tag name ────────────────────────────────
  useEffect(() => {
    if (!tagParam) {
      setTagName("");
      return;
    }
    if (tagParam === "untagged") {
      setTagName("بدون برچسب");
      return;
    }
    (async () => {
      const tag = await getItem<TagType>(DatabaseStores.tagsStore, tagParam);
      if (isMountedRef.current) setTagName(tag?.name ?? "برچسب");
    })();
  }, [tagParam]);

  // ─── Fetch tag balances (Book accounts) ────────────────────
  const fetchTagBalances = useCallback(async () => {
    if (!accountID || !isBookAccount) return;
    setIsTagBalancesLoading(true);
    try {
      const res = await fetch(`/api/accounts/${accountID}/tag-balances`);
      if (!isMountedRef.current) return;
      if (res.status === 401) {
        router.replace("/splash");
        return;
      }
      if (!res.ok) throw new Error("Tag balances fetch failed");
      const data: TagBalanceEntry[] = await res.json();
      if (isMountedRef.current) setTagBalances(data);
    } catch (err) {
      console.error("Failed to fetch tag balances:", err);
    } finally {
      if (isMountedRef.current) setIsTagBalancesLoading(false);
    }
  }, [accountID, isBookAccount, router]);

  useEffect(() => {
    if (isBookAccount) fetchTagBalances();
  }, [isBookAccount, fetchTagBalances]);

  // ─── Fetch ledger ──────────────────────────────────────────
  const fetchLedger = useCallback(async () => {
    if (!accountID || isViewingTagBreakdown) return;
    setIsLedgerLoading(true);
    try {
      let url = `/api/accounts/${accountID}/ledger?time=${timeFilter}`;
      if (tagParam) url += `&tag=${tagParam}`;
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

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  // ─── Scroll restoration ────────────────────────────────────
  const isPageReady =
    !isLoading &&
    (!isViewingTagBreakdown || !isTagBalancesLoading) &&
    (!isViewingLedger || (!isLedgerLoading && !!ledgerData));

  const { clearSavedPosition } = useScrollRestoration(SCROLL_KEY, isPageReady);

  useEffect(() => {
    const handlePopState = () => {
      const isOnDetailsPage =
        window.location.pathname === `/accounts/${accountID}`;
      if (!isOnDetailsPage) {
        clearSavedPosition();
      } else {
        fetchLedger();
        if (isBookAccount) fetchTagBalances();
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [
    fetchLedger,
    fetchTagBalances,
    clearSavedPosition,
    accountID,
    isBookAccount,
  ]);

  // ─── Handlers ──────────────────────────────────────────────
  const handleDeleteTransaction = async (txId: string) => {
    try {
      await deleteItem(DatabaseStores.transactionsStore, txId);
      setSwipedItem(null);
      fetchLedger();
      if (isBookAccount) fetchTagBalances();
      // Refresh balances store so home page shows updated balances
      const freshBalances = await getBalances();
      if (freshBalances) setBalances(freshBalances);
    } catch (err) {
      console.error("Failed to delete transaction:", err);
    }
  };

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

  const handleBackToTagBreakdown = useCallback(() => {
    const urlParams = new URLSearchParams(searchParams.toString());
    urlParams.delete("tag");
    router.replace(`/accounts/${accountID}?${urlParams.toString()}`, {
      scroll: false,
    });
  }, [searchParams, router, accountID]);

  // ─── Display helpers ───────────────────────────────────────
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
          <div className="flex items-center gap-2">
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
          </div>
        </NavbarTitle>

        {isLoading || !account ? (
          <ChartContainerLoading />
        ) : (
          <div className="animate-fade-in">
            <ChartView
              title={`موجودی ${account.name}`}
              color={account.color}
              accountID={account.id}
              tag={tagParam ?? undefined}
              time={timeFilter}
              windowLabel={`(${currentTimeFilterName})`}
            />
          </div>
        )}
      </div>

      {isViewingTagBreakdown && (
        <div className="flex flex-col gap-8">
          <div className="flex justify-between items-center gap-2">
            {isLoading ? (
              <div className="h-6 w-40 bg-elements-border rounded-md animate-pulse"></div>
            ) : (
              <SectionTitle>{`مانده‌ی برچسب‌های ${account?.name}`}</SectionTitle>
            )}

            {!isLoading && (
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
            )}
          </div>

          {isTagBalancesLoading ? (
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
                  time={timeFilter}
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
            <div className="flex justify-between items-center gap-2">
              <SectionTitle>
                {isBookAccount && tagParam
                  ? `گردش ${tagName}`
                  : `گردش حساب ${account?.name}`}
              </SectionTitle>

              <div className="flex items-center gap-2">
                {isBookAccount && tagParam && (
                  <button
                    type="button"
                    onClick={handleBackToTagBreakdown}
                    className="border px-2.5 py-2 rounded-4xl text-xs flex items-center gap-1 text-nowrap cursor-pointer bg-elements-background border-elements-border text-black"
                  >
                    بازگشت
                  </button>
                )}

                {!isLoading && (
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
                )}
              </div>
            </div>
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
