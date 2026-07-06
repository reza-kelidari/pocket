"use client";

import Capsule from "@/components/Capsule";
import NavbarTitle from "@/components/NavbarTitle";
import TransactionItem from "@/components/TransactionItem";
import Left from "@/icons/Left";
import useAccounts from "@/utility/accounts/service/useAccounts";
import { useRedirect } from "@/utility/redirect/service/useRedirect";
import useTransactions from "@/utility/transactions/service/useTransactions";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useMemo, useRef } from "react";

// تابع کمکی برای پارس ایمن پارامترها و جلوگیری از NaN
const parseNumberArray = (param: string | null): number[] => {
  if (!param) return [];
  return param
    .split(",")
    .map(Number)
    .filter((n) => !isNaN(n) && n !== 0); // فقط اعداد معتبر
};

export default function Transactions() {
  const searchParams = useSearchParams();
  const accounts = useAccounts();
  const router = useRouter();
  const transactions = useTransactions();
  const [forwardRedirect, setForwardRedirect] = useState("");
  const { add: addRedirect, last } = useRedirect();

  const transactionsFilter = useMemo(
    () => ({
      timeWindow: Number(searchParams.get("time") ?? 30),
      accounts: parseNumberArray(searchParams.get("accounts")),
      categories: parseNumberArray(searchParams.get("categories")),
      tags: parseNumberArray(searchParams.get("tags")),
    }),
    [searchParams],
  );

  const filteredTransactions = useMemo(() => {
    const now = Date.now();

    // محاسبه زمان مرز یک بار برای همه تراکنش‌ها
    // نکته: اگر time شما در دیتابیس ثانیه است، Date.now() را باید تقسیم بر 1000 کنید!
    // فرض کردم time بر اساس میلی‌ثانیه است.
    const timeLimit = now - transactionsFilter.timeWindow * 24 * 60 * 60 * 1000;

    return transactions.filter((transaction) => {
      // 1. فیلتر زمان
      if (transaction.time < timeLimit) return false;

      // 2. فیلتر حساب‌ها
      if (
        transactionsFilter.accounts.length > 0 &&
        !transactionsFilter.accounts.includes(transaction.credit) &&
        !transactionsFilter.accounts.includes(transaction.debit)
      ) {
        return false;
      }

      // 3. فیلتر دسته‌بندی‌ها

      if (
        transactionsFilter.categories.length > 0 &&
        !transactionsFilter.categories.includes(transaction.debit) &&
        !transactionsFilter.categories.includes(transaction.credit)
      ) {
        return false;
      }

      // 4. فیلتر تگ‌ها
      if (
        transactionsFilter.tags.length > 0 &&
        (transaction.tag === undefined ||
          !transactionsFilter.tags.includes(transaction.tag))
      ) {
        return false;
      }

      return true;
    });
  }, [transactions, transactionsFilter]);

  // اصلاح وابستگی‌های useEffect برای جلوگیری از لوپ
  useEffect(() => {
    setForwardRedirect(window.location.pathname + window.location.search);

    if (accounts.length === 0) {
      router.replace(`/splash`);
    }
  }, [accounts.length, router, searchParams]); // وابستگی به accounts و سرچ پارامز

  useEffect(() => {
    !last().includes(window.location.pathname) &&
      addRedirect(window.location.pathname);
  }, [forwardRedirect]);

  if (accounts.length === 0) return null;

  return (
    <div className="p-7.5 grid gap-15 w-screen overflow-hidden">
      <div className="grid gap-7.5">
        <NavbarTitle title="تراکنش‌ها" />
        <div className="flex items-center gap-2 overflow-x-scroll scroll-auto w-fill scrollbar-none">
          <Capsule
            Icon={Left}
            href="/transactions?time=365"
            primary={transactionsFilter.timeWindow !== 30}
          >
            {transactionsFilter.timeWindow.toLocaleString("fa-ir")} روز گذشته
          </Capsule>
          <Capsule Icon={Left} href="/transactions?time=365">
            {transactionsFilter.timeWindow.toLocaleString("fa-ir")} روز گذشته
          </Capsule>
          <Capsule Icon={Left} href="/transactions?time=365">
            {transactionsFilter.timeWindow.toLocaleString("fa-ir")} روز گذشته
          </Capsule>
          <Capsule Icon={Left} href="/transactions?time=365">
            {transactionsFilter.timeWindow.toLocaleString("fa-ir")} روز گذشته
          </Capsule>
        </div>
      </div>

      <div className="grid gap-2.5">
        {filteredTransactions.map((item) => (
          // استفاده از ID به جای Index برای Key
          <TransactionItem key={item.id} transaction={item} />
        ))}
      </div>
    </div>
  );
}
