/**
 * @fileoverview Home Page
 *
 * The application landing screen. Renders:
 * - A header with today's Jalali date and a link to the options menu.
 * - A horizontally scrollable strip of account cards.
 * - Three quick-access shortcuts: receive / pay / transfer.
 * - The overall balance chart (with the "cash on hand" figure).
 * - The five most recent transactions, each swipeable for edit/delete.
 *
 * On first mount it enforces the splash guard: if the splash screen has not
 * been shown in this session, the user is redirected to `/splash` so that
 * authentication and initial account setup can run.
 *
 * @module app/page
 */

"use client";

import AccountCard from "@/components/AccountCard";
import Button from "@/components/Button";
import ChartContainer from "@/components/ChartContainer";
import QuickAccess from "@/app/components/QuickAccess";
import Title from "@/components/SectionTitle";
import useBalances from "@/utility/balance/service/useBalances";
import { IconComponent } from "@/icons/types";
import Receive from "@/icons/Receive";
import Send from "@/icons/Send";
import Setting from "@/icons/Setting";
import ThreeDots from "@/icons/ThreeDots";
import Transfer from "@/icons/Transfer";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AccountType } from "@/utility/accounts/types";
import { TransactionType } from "@/utility/shared/transactionTypes";
import { SplashShownKey } from "@/utility/keys/sessionStore";
import SwipeableElement from "@/components/SwipeableElement";
import TransactionItem from "@/components/TransactionItem";
import { usePageShowSync } from "@/utility/shared/usePageShowSync";
import AccountCardLoading from "@/components/Skeletons/AccountCardSkeleton";
import TransactionItemLoading from "@/components/Skeletons/TransactionItemLoading";
import ChartContainerLoading from "@/components/Skeletons/ChartContainerLoading";
import { useAccountsAndTransactions } from "@/utility/shared/useAccountsAndTransactions";
import { useDeleteTransaction } from "@/utility/shared/useDeleteTransaction";

/**
 * Home page component.
 *
 * @returns The rendered home page.
 */
export default function Home() {
  const router = useRouter();

  /** All accounts belonging to the current user. */
  const [accounts, setAccounts] = useState<AccountType[]>([]);

  /** All transactions belonging to the current user. */
  const [transactions, setTransactions] = useState<TransactionType[]>([]);

  const { getBalances } = useBalances();

  /** Time window (in days) currently selected for the balance chart. */
  const [chartTime, setChartTime] = useState(30);

  /** Blocks rendering until the splash guard has decided whether to redirect. */
  const [splashGuard, setSplashGuard] = useState<boolean>(true);

  /** ID of the transaction whose swipe actions are currently open, if any. */
  const [swipedItem, setSwipedItem] = useState<string | null>(null);

  /**
   * Monotonic counter used to force-close the delete confirmation dialog
   * on any other swipeable element when a new one is opened.
   */
  const [dragCounter, setDragCounter] = useState(0);

  /** Today's date, formatted in Persian, shown in the header. */
  const [headerDate, setHeaderDate] = useState("");

  /** `true` while initial data is being fetched. */
  const [isLoading, setIsLoading] = useState(false);

  const pathname = usePathname();

  /** Ref to the horizontal account cards strip, used for scroll resets. */
  const accountsScrollRef = useRef<HTMLDivElement>(null);

  const fetchAll = useAccountsAndTransactions();
  const deleteTransaction = useDeleteTransaction();

  /**
   * Enforce the splash guard: if the splash screen has not been shown in
   * this session, redirect there so authentication and initial setup run.
   */
  useEffect(() => {
    if (!sessionStorage.getItem(SplashShownKey)) router.replace("/splash");
    else setSplashGuard(false);
  }, [router]);

  /** Scroll to top whenever the route changes back to home. */
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  /**
   * Loads accounts + transactions and populates the balances store.
   * Only shows the skeleton on the very first load; subsequent refreshes
   * swap data silently.
   */
  const loadData = async () => {
    const isFirstLoad = accounts.length === 0 && transactions.length === 0;
    if (isFirstLoad) setIsLoading(true);
    const { accounts: accs, transactions: txs } = await fetchAll();
    setAccounts(accs);
    setTransactions(txs);
    if (isFirstLoad) setIsLoading(false);
  };

  /** Initial data load. */
  useEffect(() => {
    loadData();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Resets the horizontal account cards strip to its rightmost (RTL start) position. */
  const resetAccountsScroll = () => {
    if (accountsScrollRef.current) {
      accountsScrollRef.current.scrollTo({ left: 0, behavior: "auto" });
    }
  };

  /**
   * Runs on mount and whenever loading state or accounts change, to keep
   * the account strip scrolled to the correct start position (RTL).
   */
  useLayoutEffect(() => {
    resetAccountsScroll();
    const raf = requestAnimationFrame(resetAccountsScroll);
    return () => cancelAnimationFrame(raf);
  }, [isLoading, accounts]);

  /**
   * Refreshes data and resets the account strip scroll whenever the page
   * becomes visible again (e.g. returning from a detail screen).
   */
  usePageShowSync(() => {
    loadData();
    requestAnimationFrame(resetAccountsScroll);
  }, []);

  /** Recomputes the header date whenever the route changes. */
  useEffect(() => {
    setHeaderDate(
      new Date().toLocaleDateString("fa-IR", {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
    );
  }, [pathname]);

  /** The five most recent transactions, newest first. */
  const latestTransactions = useMemo(() => {
    return transactions.slice(0, 5);
  }, [transactions]);

  /** Shortcuts displayed in the center of the home screen. */
  const quickAccessList: { name: string; link: string; icon: IconComponent }[] =
    [
      { name: "دریافت", link: "/transactions/add?type=debit", icon: Receive },
      { name: "پرداخت", link: "/transactions/add?type=credit", icon: Send },
      {
        name: "انتقال",
        link: "/transactions/add?type=transfer",
        icon: Transfer,
      },
    ];

  if (splashGuard) return null;

  /**
   * Deletes a transaction and refreshes accounts + transactions + balances.
   *
   * @param id - The ID of the transaction to delete.
   */
  const handleDeleteTransaction = async (id: string) => {
    const { accounts: freshAccs, transactions: newTxs } =
      await deleteTransaction(id);
    setAccounts(freshAccs);
    setTransactions(newTxs);
    setSwipedItem(null);
  };

  return (
    <div className="flex flex-col gap-15 p-7.5 pb-15 overflow-x-hidden">
      {/* ─── Header: date + options menu ──────────────────────── */}
      <header className="flex justify-between p-2.5">
        <div className="flex w-7.5"></div>
        <h3 className="text-secondary text-center">{headerDate}</h3>
        <Link href="/options">
          <ThreeDots className="fill-primary" height={30} width={30} />
        </Link>
      </header>

      {/* ─── Accounts strip ───────────────────────────────────── */}
      <div className="grid gap-7.5">
        <Link href="/accounts" className="w-fit">
          <Title>
            <div className="flex gap-0.5 items-center">
              <div>حساب‌ها</div>
              <Setting height={25} className="fill-primary" />
            </div>
          </Title>
        </Link>

        <div
          ref={accountsScrollRef}
          className={`flex gap-10 overflow-x-auto snap-x snap-mandatory px-[calc(50vw)] scrollbar-none -m-7.5 mb-0 py-7.5 ${!isLoading ? "animate-fade-in" : ""}`}
        >
          {isLoading ? (
            <AccountCardLoading />
          ) : (
            accounts.map(
              (account) =>
                !account.hidden && (
                  <AccountCard
                    key={account.id}
                    lastBalance={
                      getBalances()
                        .find((item) => item.id === account.id)
                        ?.history?.at(-1)?.balance ?? 0
                    }
                    {...account}
                  />
                ),
            )
          )}
        </div>
      </div>

      {/* ─── Quick access shortcuts ───────────────────────────── */}
      <div className="flex gap-16 w-full content-around justify-center">
        {quickAccessList.map((item) => (
          <QuickAccess key={item.link} Icon={item.icon} link={item.link}>
            {item.name}
          </QuickAccess>
        ))}
      </div>

      {/* ─── Balance chart (with cash-on-hand figure) ─────────── */}
      {isLoading ? (
        <ChartContainerLoading />
      ) : (
        <ChartContainer
          title={"روند موجودی"}
          time={chartTime}
          onTimeChange={setChartTime}
          link="/analyze"
          linkTitle="تحلیل و بررسی پیشرفته"
          showCashOnHand
        />
      )}

      {/* ─── Latest transactions ──────────────────────────────── */}
      <div className={`grid gap-7.5 ${!isLoading ? "animate-fade-in" : ""}`}>
        <Title>تراکنش‌های اخیر</Title>

        <div className="flex flex-col w-full gap-5">
          {isLoading ? (
            <>
              <TransactionItemLoading />
              <TransactionItemLoading />
              <TransactionItemLoading />
            </>
          ) : (
            latestTransactions.map((transaction) => {
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
                      ? () => handleDeleteTransaction(transaction.id)
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
            })
          )}
        </div>
        {!isLoading && (
          <Button href="/transactions">مشاهده همه تراکنش‌ها</Button>
        )}
      </div>
    </div>
  );
}
