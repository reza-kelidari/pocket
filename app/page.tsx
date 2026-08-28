"use client";

import AccountCard from "@/components/AccountCard";
import Button from "@/components/Button";
import ChartContainer from "@/components/ChartContainer";
import QuickAccess from "@/app/components/QuickAccess";
import Title from "@/components/SectionTitle";
import useBalances from "@/utility/balance/service/useBalances";
import { getAccountBalances } from "@/utility/shared/balancesMethods";
import { IconComponent } from "@/icons/types";
import Receive from "@/icons/Receive";
import Send from "@/icons/Send";
import Setting from "@/icons/Setting";
import ThreeDots from "@/icons/ThreeDots";
import Transfer from "@/icons/Transfer";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { deleteItem, getAll } from "@/utility/db/Database";
import { DatabaseStores } from "@/utility/keys/database";
import { AccountType } from "@/utility/accounts/types";
import { TransactionType } from "@/utility/shared/transactionTypes";
import { SplashShownKey } from "@/utility/keys/sessionStore";
import SwipeableElement from "@/components/SwipeableElement";
import TransactionItem from "@/components/TransactionItem";
import { usePageShowSync } from "@/utility/shared/usePageShowSync";
import AccountCardLoading from "@/components/AccountCardLoading";
import TransactionItemLoading from "@/components/TransactionItemLoading";
import ChartContainerLoading from "@/components/ChartContainerLoading";

export default function Home() {
  const router = useRouter();
  const { accountsStore, transactionsStore } = DatabaseStores;
  const [accounts, setAccounts] = useState<AccountType[]>([]);
  const [transactions, setTransactions] = useState<TransactionType[]>([]);
  const { getBalances, setBalances } = useBalances();

  const [splashGuard, setSplashGuard] = useState<boolean>(true);
  const [swipedItem, setSwipedItem] = useState<string | null>(null);
  const [dragCounter, setDragCounter] = useState(0);
  const [headerDate, setHeaderDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const pathname = usePathname();

  const accountsScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sessionStorage.getItem(SplashShownKey)) router.replace("/splash");
    else setSplashGuard(false);
  }, [router]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const loadData = async () => {
    const isFirstLoad = accounts.length === 0 && transactions.length === 0;
    if (isFirstLoad) setIsLoading(true);
    const [accs, txs] = await Promise.all([
      getAll<AccountType>(accountsStore),
      getAll<TransactionType>(transactionsStore),
    ]);
    setAccounts(accs);
    setTransactions(txs);
    setBalances(getAccountBalances(accs, txs));
    if (isFirstLoad) setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [accountsStore, transactionsStore]);

  const resetAccountsScroll = () => {
    if (accountsScrollRef.current) {
      accountsScrollRef.current.scrollTo({ left: 0, behavior: "auto" });
    }
  };

  useLayoutEffect(() => {
    resetAccountsScroll();
    const raf = requestAnimationFrame(resetAccountsScroll);
    return () => cancelAnimationFrame(raf);
  }, [isLoading, accounts]);

  usePageShowSync(() => {
    loadData();
    requestAnimationFrame(resetAccountsScroll);
  }, []);

  useEffect(() => {
    setHeaderDate(
      new Date().toLocaleDateString("fa-IR", {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
    );
  }, [pathname]);

  const latestTransactions = useMemo(() => {
    return transactions.slice(0, 5);
  }, [transactions]);

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

  const handleDeleteTransaction = async (id: string) => {
    await deleteItem(transactionsStore, id);
    const newTxs = transactions.filter((t) => t.id !== id);
    setTransactions(newTxs);
    setBalances(getAccountBalances(accounts, newTxs));
    setSwipedItem(null);
  };

  return (
    <div className="flex flex-col gap-15 p-7.5 pb-15 overflow-x-hidden">
      <header className="flex justify-between p-2.5">
        <div className="flex w-7.5"></div>
        <h3 className="text-secondary text-center">{headerDate}</h3>
        <Link href="/options">
          <ThreeDots className="fill-primary" height={30} width={30} />
        </Link>
      </header>

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

      <div className="flex gap-16 w-full content-around justify-center">
        {quickAccessList.map((item) => (
          <QuickAccess key={item.link} Icon={item.icon} link={item.link}>
            {item.name}
          </QuickAccess>
        ))}
      </div>

      {isLoading ? (
        <ChartContainerLoading />
      ) : (
        <ChartContainer
          title={"روند موجودی"}
          timeSelector
          link="/analyze"
          linkTitle="تحلیل و بررسی پیشرفته"
        />
      )}

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
