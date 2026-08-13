"use client";

import Capsule from "@/components/Capsule";
import CapsuleLoading from "@/components/CapsuleLoading";
import ChartView from "@/components/ChartContainer";
import ChartContainerLoading from "@/components/ChartContainerLoading";
import NavbarTitle from "@/components/NavbarTitle";
import SectionTitle from "@/components/SectionTitle";
import SwipeableElement from "@/components/SwipeableElement";
import TransactionItem from "@/components/TransactionItem";
import TransactionItemLoading from "@/components/TransactionItemLoading";
import Pen from "@/icons/Pen";
import Left from "@/icons/Left";
import { AccountType } from "@/utility/accounts/types";
import useBalances from "@/utility/balance/service/useBalances";
import { deleteItem, getAll, getItem } from "@/utility/db/Database";
import { DatabaseStores } from "@/utility/keys/database";
import { getAccountBalances } from "@/utility/shared/balancesMethods";
import { PrimaryColors } from "@/utility/shared/colors";
import { TransactionType } from "@/utility/shared/transactionTypes";
import { timeFilters } from "@/app/transactions/methods";
import { toJalaliDateArray } from "@/utility/shared/timeMethods";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** Shape returned by the ledger endpoint */
type LedgerTransaction = TransactionType & { balanceAfter: number };

interface LedgerResponse {
  balanceBefore: number;
  transactions: LedgerTransaction[];
}

export default function AccountsDetails() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { accountsStore, transactionsStore } = DatabaseStores;
  const accountID = searchParams.get("id") ?? "";

  const [account, setAccount] = useState<AccountType>();
  const [accounts, setAccounts] = useState<AccountType[]>([]);
  const [allTransactions, setAllTransactions] = useState<TransactionType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Ledger state
  const [ledgerData, setLedgerData] = useState<LedgerResponse | null>(null);
  const [isLedgerLoading, setIsLedgerLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<number>(29);
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);

  // Swipe state
  const [swipedItem, setSwipedItem] = useState<string | null>(null);
  const [dragCounter, setDragCounter] = useState(0);

  const { setBalances } = useBalances();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // تولید گزینه‌های فیلتر زمانی دقیقاً هم‌خوان با لیست تراکنش‌ها
  const timeFilterOptions = useMemo(
    () => timeFilters(toJalaliDateArray(new Date())),
    [],
  );

  // Close dropdown on outside click
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

  // Redirect if no account ID
  useEffect(() => {
    if (!accountID) router.replace("/accounts");
  }, [accountID, router]);

  // Initial load: account info, all accounts, all transactions (for chart)
  useEffect(() => {
    if (!accountID) return;
    (async () => {
      setIsLoading(true);
      const [acc, accs, txs] = await Promise.all([
        getItem<AccountType>(accountsStore, accountID),
        getAll<AccountType>(accountsStore),
        getAll<TransactionType>(transactionsStore),
      ]);
      setAccount(acc);
      setAccounts(accs);
      setAllTransactions(txs);
      setIsLoading(false);
    })();
  }, [accountID, accountsStore, transactionsStore]);

  // Fetch ledger data whenever timeFilter changes
  const fetchLedger = useCallback(async () => {
    if (!accountID) return;
    setIsLedgerLoading(true);
    try {
      const res = await fetch(
        `/api/accounts/${accountID}/ledger?time=${timeFilter}`,
      );
      if (res.status === 401) {
        router.replace("/splash");
        return;
      }
      if (!res.ok) throw new Error("Ledger fetch failed");
      const data: LedgerResponse = await res.json();
      setLedgerData(data);
    } catch (err) {
      console.error("Failed to fetch ledger:", err);
    } finally {
      setIsLedgerLoading(false);
    }
  }, [accountID, timeFilter, router]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  // Handle delete transaction
  const handleDeleteTransaction = async (id: string) => {
    await deleteItem(transactionsStore, id);
    // Refresh both chart data and ledger
    const newTxs = allTransactions.filter((t) => t.id !== id);
    setAllTransactions(newTxs);
    setBalances(getAccountBalances(accounts, newTxs));
    setSwipedItem(null);
    fetchLedger();
  };

  const currentTimeFilterName = useMemo(
    () =>
      timeFilterOptions.find((o) => o.time === timeFilter)?.name ??
      "۳۰ روز گذشته",
    [timeFilter, timeFilterOptions],
  );

  if (!accountID) return null;

  return (
    <div className="p-7.5 flex flex-col gap-15 w-full max-w-full min-w-0 overflow-x-hidden min-h-screen">
      <div className="flex flex-col gap-15 w-full min-w-0">
        <NavbarTitle title={isLoading ? "جزئیات حساب" : (account?.name ?? "")}>
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
                  className="border px-2.5 py-2 rounded-4xl text-xs flex items-center gap-1 text-nowrap bg-primary-background border-primary-border text-primary cursor-pointer"
                >
                  {currentTimeFilterName}
                  <Left height={15} width={15} className="fill-primary" />
                </button>
                {showTimeDropdown && (
                  <div className="absolute top-full left-0 mt-2 p-2 flex flex-col gap-1 bg-white border border-elements-border rounded-2xl shadow-lg z-50 min-w-36 overflow-show">
                    {timeFilterOptions.map((option) => (
                      <button
                        key={option.time}
                        type="button"
                        onClick={() => {
                          setTimeFilter(option.time);
                          setShowTimeDropdown(false);
                        }}
                        className={`block w-full text-right px-4 rounded-md py-2.5 text-xs transition-colors ${
                          option.time === timeFilter
                            ? "text-primary font-bold bg-primary-background"
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
