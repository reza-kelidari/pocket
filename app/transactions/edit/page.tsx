"use client";

import Capsule from "@/components/Capsule";
import NavbarTitle from "@/components/NavbarTitle";
import Left from "@/icons/Left";
import useTransactions from "@/utility/transactions/service/useTransactions";
import { TransactionType } from "@/utility/transactions/types";
import {
  jalaliToTimestamp,
  toEnglishDigits,
  toJalaliDateArray,
} from "@/utility/time/methods";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccounts } from "@/utility/accounts/service/useAccounts";
import { getCategoryById } from "@/utility/transactions/methods";

// استفاده از همان کلید برای هماهنگی با صفحات انتخاب حساب و دسته‌بندی
export const CREATE_TRANSACTION_KEY = "new-transaction";

const defaultTransaction: Omit<TransactionType, "id"> = {
  type: "credit",
  name: "",
  time: Date.now(),
  value: 0,
  debit: 0,
  credit: 0,
  note: "",
};

// ==================== توابع کمکی خالص (بیرون کامپوننت) ====================

const toPersianDigits = (value: string) =>
  value.replace(/\d/g, (d) => Number(d).toLocaleString("fa-IR"));

function formatJalaliDate(timestamp: number): string {
  if (!timestamp) return "";
  const [year, month, day] = toJalaliDateArray(new Date(timestamp));
  return toPersianDigits(
    `${year}/${month.toString().padStart(2, "0")}/${day.toString().padStart(2, "0")}`,
  );
}

function formatTimeInput(timestamp: number): string {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return toPersianDigits(`${hours}:${minutes}`);
}

function parseJalaliInput(formattedValue: string): number {
  const raw = toEnglishDigits(formattedValue).replace(/\D/g, "");
  if (raw.length !== 8) return 0;
  const year = parseInt(raw.slice(0, 4), 10);
  const month = parseInt(raw.slice(4, 6), 10);
  const day = parseInt(raw.slice(6, 8), 10);
  if (year >= 1300 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
    return jalaliToTimestamp([year, month, day]);
  }
  return 0;
}

function parseTimeInput(formattedValue: string): number {
  const raw = toEnglishDigits(formattedValue).replace(/\D/g, "");
  if (raw.length !== 4) return 0;
  const hours = parseInt(raw.slice(0, 2), 10);
  const minutes = parseInt(raw.slice(2, 4), 10);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return 0;
  const now = new Date();
  now.setHours(hours, minutes, 0, 0);
  return now.getTime();
}

function formatJalaliInput(value: string): string {
  const digits = toEnglishDigits(value).replace(/\D/g, "").slice(0, 8);
  let result = "";
  for (let i = 0; i < digits.length; i++) {
    if (i === 4 || i === 6) result += "/";
    result += digits[i];
  }
  return toPersianDigits(result);
}

function formatTimeTyping(value: string): string {
  const digits = toEnglishDigits(value).replace(/\D/g, "").slice(0, 4);
  let result = "";
  for (let i = 0; i < digits.length; i++) {
    if (i === 2) result += ":";
    result += digits[i];
  }
  return toPersianDigits(result);
}

function mergeDateTime(
  baseTimestamp: number,
  newTimestamp: number,
  part: "date" | "time",
): number {
  const base = new Date(baseTimestamp);
  const incoming = new Date(newTimestamp);
  const result = new Date(base);

  if (part === "date") {
    result.setFullYear(
      incoming.getFullYear(),
      incoming.getMonth(),
      incoming.getDate(),
    );
  } else {
    result.setHours(
      incoming.getHours(),
      incoming.getMinutes(),
      incoming.getSeconds(),
      0,
    );
  }
  return result.getTime();
}

export default function TransactionEdit() {
  const searchParams = useSearchParams();
  const txID = searchParams.get("id");
  const router = useRouter();
  const pathname = usePathname();
  const { getTransactions, updateTransaction } = useTransactions();
  const { getAccounts } = useAccounts();

  // ==================== State ====================
  const [transaction, setTransaction] = useState<TransactionType | null>(() => {
    if (typeof window === "undefined" || !txID) return null;

    const originalTx = getTransactions().find((t) => t.id === Number(txID));
    if (!originalTx) return null;

    // بررسی وجود پیش‌نویس ویرایش در sessionStorage
    const data = sessionStorage.getItem(CREATE_TRANSACTION_KEY);
    if (data) {
      try {
        const parsed = JSON.parse(data) as TransactionType;
        // استفاده از پیش‌نویس فقط اگر متعلق به همین تراکنش باشد
        if (parsed.id === Number(txID)) return parsed;
      } catch {}
    }
    return originalTx;
  });

  const [dateInput, setDateInput] = useState(() =>
    transaction ? formatJalaliDate(transaction.time) : "",
  );
  const [timeInput, setTimeInput] = useState(() =>
    transaction ? formatTimeInput(transaction.time) : "",
  );

  // ==================== Derived States ====================
  const accounts = getAccounts();
  const transactionType = transaction?.type;

  const toAccountName = useMemo(() => {
    if (!transaction) return "";
    const id =
      transaction.type === "credit" ? transaction.credit : transaction.debit;
    return accounts.find((item) => item.id === id)?.name ?? "";
  }, [accounts, transaction]);

  const fromAccountName = useMemo(() => {
    if (!transaction || transaction.type !== "transfer") return "";
    return accounts.find((item) => item.id === transaction.credit)?.name ?? "";
  }, [accounts, transaction]);

  const categoryName = useMemo(() => {
    if (!transaction) return "";
    const id =
      transaction.type === "debit"
        ? transaction.credit
        : transaction.type === "credit"
          ? transaction.debit
          : 0;
    return id ? (getCategoryById(id)?.name ?? "") : "";
  }, [transaction]);

  // ==================== Validation ====================
  const isValid = useMemo(() => {
    if (!transaction) return false;
    const nameValid = transaction.name.trim().length >= 3;
    const valueValid = transaction.value > 0;
    const dateValid = !!transaction.time && transaction.time > 0;
    const accountValid =
      transaction.type === "transfer"
        ? transaction.debit > 0 &&
          transaction.credit > 0 &&
          transaction.debit !== transaction.credit
        : transaction.debit > 0 || transaction.credit > 0;
    return nameValid && valueValid && dateValid && accountValid;
  }, [transaction]);

  // ==================== State Update & Sync ====================
  const persist = useCallback((data: TransactionType) => {
    sessionStorage.setItem(CREATE_TRANSACTION_KEY, JSON.stringify(data));
  }, []);

  const updateTransactionState = useCallback(
    (updated: Partial<TransactionType>) => {
      setTransaction((prev) => {
        if (!prev) return prev;
        const newTransaction = { ...prev, ...updated };
        persist(newTransaction);
        return newTransaction;
      });
    },
    [persist],
  );

  // ==================== Handlers ====================
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    updateTransactionState({ name: e.target.value });

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = toEnglishDigits(e.target.value).replace(/\D/g, "");
    updateTransactionState({ value: Number(raw || 0) });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatJalaliInput(e.target.value);
    setDateInput(formatted);
    const timestamp = parseJalaliInput(formatted);
    if (timestamp > 0 && transaction) {
      updateTransactionState({
        time: mergeDateTime(transaction.time, timestamp, "date"),
      });
    }
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatTimeTyping(e.target.value);
    setTimeInput(formatted);
    const timestamp = parseTimeInput(formatted);
    if (timestamp > 0 && transaction) {
      updateTransactionState({
        time: mergeDateTime(transaction.time, timestamp, "time"),
      });
    }
  };

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) =>
    updateTransactionState({ note: e.target.value });

  const handleSave = () => {
    if (!isValid || !transaction) return;
    updateTransaction(transaction); // آپدیت در استور اصلی
    sessionStorage.removeItem(CREATE_TRANSACTION_KEY);
    router.back();
  };

  const handleCancel = () => {
    sessionStorage.removeItem(CREATE_TRANSACTION_KEY);
  };

  // ==================== Effects ====================
  useEffect(() => {
    // اگر تراکنش وجود نداشت یا آیدی نامعتبر بود
    if (!txID || !transaction) {
      router.replace("/transactions");
    }
  }, [txID, transaction, router]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (transaction) persist(transaction);
  }, []);

  // سنک کردن استیت با بازگشت از صفحات دیگر (account/category)
  useEffect(() => {
    const syncFromStorage = () => {
      const data = sessionStorage.getItem(CREATE_TRANSACTION_KEY);
      if (!data || !txID) return;

      try {
        const parsed = JSON.parse(data) as TransactionType;
        // فقط اگر پیش‌نویس متعلق به همین تراکنش باشد
        if (parsed.id !== Number(txID)) return;

        setTransaction((prev) => {
          if (!prev || JSON.stringify(prev) === JSON.stringify(parsed))
            return prev;
          setDateInput(formatJalaliDate(parsed.time));
          setTimeInput(formatTimeInput(parsed.time));
          return parsed;
        });
      } catch {}
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") syncFromStorage();
    };

    window.addEventListener("focus", syncFromStorage);
    window.addEventListener("pageshow", syncFromStorage);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", syncFromStorage);
      window.removeEventListener("pageshow", syncFromStorage);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [txID]);

  // در صورت عدم وجود تراکنش، رندر نکنیم
  if (!txID || !transaction || !transactionType) return null;

  return (
    <div className="p-7.5 grid gap-15">
      <div className="grid gap-7.5">
        <NavbarTitle
          title={
            transactionType === "debit"
              ? "ویرایش دریافت"
              : transactionType === "credit"
                ? "ویرایش پرداخت"
                : "ویرایش انتقال"
          }
          onClick={handleCancel}
        >
          <Capsule Icon={Left} primary={isValid} onClick={handleSave}>
            ذخیره تغییرات
          </Capsule>
        </NavbarTitle>
      </div>

      <div className="grid gap-7.5">
        <div className="grid gap-2">
          <span className="text-xs">نام تراکنش</span>
          <input
            type="text"
            value={transaction.name}
            onChange={handleNameChange}
            placeholder={
              transactionType === "debit"
                ? "حقوق ماهانه"
                : transactionType === "credit"
                  ? "خرید خونه"
                  : "انتقال بین بانکی"
            }
            className="h-12 text-sm border border-elements-border bg-elements-background px-4 rounded-2xl outline-none focus:bg-primary-background focus:border-primary-border transition-all"
          />
        </div>

        <div className="grid gap-2">
          <span className="text-xs">مبلغ</span>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              value={
                transaction.value
                  ? transaction.value.toLocaleString("fa-IR")
                  : ""
              }
              onChange={handleValueChange}
              placeholder="۰"
              className="h-12 w-full text-sm border border-elements-border bg-elements-background px-4 pl-10 rounded-2xl outline-none focus:bg-primary-background focus:border-primary-border transition-all"
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary text-[10px] pointer-events-none">
              ﷼
            </span>
          </div>
        </div>

        {transactionType === "transfer" && (
          <div className="grid gap-2">
            <span className="text-xs">حساب مبدأ</span>
            <Link
              href={`/transactions/add/account?type=fromAccount`}
              className="flex items-center justify-between h-12 w-full border border-elements-border bg-elements-background px-4 rounded-2xl text-sm active:bg-elements-background/70 transition-colors"
            >
              <span>{fromAccountName || "انتخاب حساب مبدأ"}</span>
              <Left width={16} height={16} className="fill-secondary" />
            </Link>
          </div>
        )}

        <div className="grid gap-2">
          <span className="text-xs">
            {transactionType === "transfer" ? "حساب مقصد" : "انتخاب حساب"}
          </span>
          <Link
            href={`/transactions/add/account?type=toAccount`}
            className="flex items-center justify-between h-12 w-full border border-elements-border bg-elements-background px-4 rounded-2xl text-sm active:bg-elements-background/70 transition-colors"
          >
            <span>
              {toAccountName ||
                (transactionType === "transfer"
                  ? "انتخاب حساب مقصد"
                  : "انتخاب حساب")}
            </span>
            <Left width={16} height={16} className="fill-secondary" />
          </Link>
        </div>

        {["debit", "credit"].includes(transactionType) && (
          <div className="grid gap-2">
            <span className="text-xs">دسته‌بندی</span>
            <Link
              href={`/transactions/add/category?type=${transactionType}`}
              className="flex items-center justify-between h-12 w-full border border-elements-border bg-elements-background px-4 rounded-2xl text-sm active:bg-elements-background/70 transition-colors"
            >
              <span>{categoryName || "انتخاب دسته‌بندی"}</span>
              <Left width={16} height={16} className="fill-secondary" />
            </Link>
          </div>
        )}

        <div className="grid gap-2">
          <span className="text-xs">برچسب (اختیاری)</span>
          <Link
            href="#"
            className="flex items-center justify-between h-12 w-full border border-elements-border bg-elements-background px-4 rounded-2xl text-sm active:bg-elements-background/70 transition-colors"
          >
            <span>نام برچسب</span>
            <Left width={16} height={16} className="fill-secondary" />
          </Link>
        </div>

        <div className="grid gap-2">
          <span className="text-xs">تاریخ</span>
          <input
            type="text"
            inputMode="numeric"
            value={dateInput}
            onChange={handleDateChange}
            placeholder="۱۴۰۵/۰۱/۰۱"
            className="h-12 text-sm border border-elements-border bg-elements-background px-4 rounded-2xl outline-none focus:bg-primary-background focus:border-primary-border transition-all"
          />
        </div>

        <div className="grid gap-2">
          <span className="text-xs">ساعت</span>
          <input
            type="text"
            inputMode="numeric"
            value={timeInput}
            onChange={handleTimeChange}
            placeholder="۱۲:۰۰"
            className="h-12 text-sm border border-elements-border bg-elements-background px-4 rounded-2xl outline-none focus:bg-primary-background focus:border-primary-border transition-all"
          />
        </div>

        <div className="grid gap-7.5">
          <div className="grid gap-2">
            <span className="text-xs">شرح تراکنش (اختیاری)</span>
            <textarea
              value={transaction.note}
              onChange={handleNoteChange}
              placeholder="توضیحات"
              className="min-h-25 resize-y text-sm border border-elements-border bg-elements-background p-4 rounded-2xl outline-none focus:bg-primary-background focus:border-primary-border transition-all"
            />
          </div>
        </div>
      </div>
      <br />
    </div>
  );
}
