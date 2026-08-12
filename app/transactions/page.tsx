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
import { TransactionType } from "@/utility/shared/transactionTypes";
import { deleteItem, getAll } from "@/utility/db/Database";
import { DatabaseStores } from "@/utility/keys/database";
import SwipeableElement from "@/components/SwipeableElement";

const SCROLL_KEY = "transactions-scroll-position";
const FILTER_KEY = "transactions-scroll-filter";

export default function Transactions() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { accountsStore, transactionsStore } = DatabaseStores;
  const [transactions, setTransactions] = useState<TransactionType[]>([]);
  const [accounts, setAccounts] = useState<AccountType[]>([]);
  const [swipedItem, setSwipedItem] = useState<string | null>(null);
  const [dragCounter, setDragCounter] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const scrollRestoredRef = useRef(false);

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

  // جلوگیری از ریست خودکار اسکرول توسط مرورگر
  useEffect(() => {
    history.scrollRestoration = "manual";
  }, []);

  // ذخیره اسکرول با کمی تاخیر (Debounce)
  // دلیل: وقتی روی تراکنش کلیک می‌کنید، Next.js قبل از لود صفحه بعد اسکرول رو صفر می‌کنه.
  // با این تاخیر، اون ایونتِ صفر شدن کنسل میشه و مقدار قبلی پاک نمیشه.
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const handleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
      }, 150);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // بازیابی اسکرول بعد از لود کامل
  useEffect(() => {
    if (isLoading || transactions.length === 0 || scrollRestoredRef.current)
      return;

    const currentFilter = JSON.stringify(transactionsFilter);
    const savedFilter = sessionStorage.getItem(FILTER_KEY);
    sessionStorage.setItem(FILTER_KEY, currentFilter);

    if (savedFilter !== currentFilter) {
      scrollRestoredRef.current = true;
      window.scrollTo({ top: 0, behavior: "instant" });
      return;
    }

    const savedScroll = sessionStorage.getItem(SCROLL_KEY);
    if (!savedScroll) {
      scrollRestoredRef.current = true;
      return;
    }

    const targetScroll = parseInt(savedScroll, 10);
    if (targetScroll <= 0) {
      scrollRestoredRef.current = true;
      return;
    }

    scrollRestoredRef.current = true;
    let attempts = 0;
    const maxAttempts = 5;
    let cancelled = false;

    const tryScroll = () => {
      if (cancelled) return;
      attempts++;

      const maxScroll =
        document.documentElement.scrollHeight - window.innerHeight;

      if (maxScroll >= targetScroll || attempts >= maxAttempts) {
        window.scrollTo({ top: targetScroll, behavior: "smooth" });
      } else {
        setTimeout(tryScroll, 1000);
      }
    };

    // شروع اولین تلاش بعد از ۱ ثانیه
    const timer = setTimeout(() => {
      tryScroll();
    }, 1000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isLoading, transactions.length, transactionsFilter]);

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

  const navigateWithLoading = useCallback(
    (url: string) => {
      window.scrollTo({ top: 0 });
      sessionStorage.removeItem(SCROLL_KEY);
      router.replace(url);
    },
    [router],
  );

  const selectedAccount =
    transactionsFilter.accounts.length === 1
      ? accounts.find((item) => item.id === transactionsFilter.accounts[0])
      : undefined;

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
