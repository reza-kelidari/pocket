"use client";

import Capsule from "@/components/Capsule";
import NavbarTitle from "@/components/NavbarTitle";
import Left from "@/icons/Left";
import { TransactionType } from "@/utility/transactions/types";
import { AccountType } from "@/utility/accounts/types";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getCategoryById } from "@/utility/shared/transactionsMethods";
import {
  formatJalaliDate,
  formatTimeInput,
  formatJalaliInput,
  formatTimeTyping,
  parseJalaliInput,
  parseTimeInput,
  mergeDateTime,
} from "@/utility/shared/formatters";
import { usePageShowSync } from "@/utility/shared/usePageShowSync";
import { toEnglishDigits } from "@/utility/shared/timeMethods";
import { getAll, putItem } from "@/utility/db/Database";
import { TagType } from "@/utility/tags/type";
import { DatabaseStores } from "@/utility/keys/database";

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

export default function AddTransaction() {
  const searchParams = useSearchParams();
  const transactionType = searchParams.get("type") as TransactionType["type"];
  const router = useRouter();
  const pathname = usePathname();
  const [tags, setTags] = useState<TagType[]>([]);
  const [accounts, setAccounts] = useState<AccountType[]>([]);
  const { accountsStore, transactionsStore, tagsStore } = DatabaseStores;

  const [transaction, setTransaction] = useState<TransactionType>(() => {
    if (typeof window === "undefined")
      return { ...defaultTransaction, id: 0, type: transactionType };

    const data = sessionStorage.getItem(CREATE_TRANSACTION_KEY);
    if (!data)
      return { ...defaultTransaction, id: Date.now(), type: transactionType };

    try {
      const parsed = JSON.parse(data) as Partial<TransactionType>;
      const id = parsed.id && parsed.id !== 0 ? parsed.id : Date.now();
      return { ...defaultTransaction, ...parsed, id, type: transactionType };
    } catch {
      return { ...defaultTransaction, id: Date.now(), type: transactionType };
    }
  });

  const [dateInput, setDateInput] = useState(() =>
    formatJalaliDate(transaction.time),
  );

  const [timeInput, setTimeInput] = useState(() =>
    formatTimeInput(transaction.time),
  );

  useEffect(() => {
    async function loadInitialData() {
      if (!transactionType) {
        router.replace("/");
        return;
      }

      setAccounts(await getAll<AccountType>(accountsStore));
      setTags(await getAll<TagType>(tagsStore));

      const txs = await getAll<TransactionType>(transactionsStore);
      if (txs.length === 0) {
        router.replace(
          `/splash?from=/transactions/add?type=${transactionType}`,
        );
      }
    }
    loadInitialData();
  }, [router, transactionType]);

  const toAccountName = useMemo(() => {
    const id =
      transaction.type === "credit" ? transaction.credit : transaction.debit;
    return accounts.find((item) => item.id === id)?.name ?? "";
  }, [accounts, transaction.type, transaction.credit, transaction.debit]);

  const fromAccountName = useMemo(() => {
    if (transaction.type !== "transfer") return "";
    return accounts.find((item) => item.id === transaction.credit)?.name ?? "";
  }, [accounts, transaction.type, transaction.credit]);

  const tagName = useMemo(() => {
    if (transaction.tag)
      return tags.find((item) => item.id == transaction.tag)?.name;
    else return null;
  }, [transaction.tag, tags]);

  const categoryName = useMemo(() => {
    const id =
      transaction.type === "debit"
        ? transaction.credit
        : transaction.type === "credit"
          ? transaction.debit
          : 0;
    return id ? (getCategoryById(id)?.name ?? "") : "";
  }, [transaction.type, transaction.credit, transaction.debit]);

  const isValid = useMemo(() => {
    const nameValid = transaction.name.trim().length >= 3;
    const valueValid = transaction.value > 0;
    const dateValid = dateInput.trim().length === 10;
    const timeValid = timeInput.trim().length === 5;
    let accountAndCategoryValid = false;
    if (transaction.type === "transfer") {
      accountAndCategoryValid =
        transaction.debit > 0 &&
        transaction.credit > 0 &&
        transaction.debit !== transaction.credit;
    } else if (transaction.type === "debit") {
      accountAndCategoryValid = transaction.debit > 0 && transaction.credit > 0;
    } else if (transaction.type === "credit") {
      accountAndCategoryValid = transaction.credit > 0 && transaction.debit > 0;
    }
    return (
      nameValid &&
      valueValid &&
      dateValid &&
      timeValid &&
      accountAndCategoryValid
    );
  }, [transaction, dateInput, timeInput]);

  const persist = useCallback((data: TransactionType) => {
    sessionStorage.setItem(CREATE_TRANSACTION_KEY, JSON.stringify(data));
  }, []);

  const updateTransaction = useCallback(
    (updated: Partial<TransactionType>) => {
      setTransaction((prev) => {
        const newTransaction = { ...prev, ...updated };
        persist(newTransaction);
        return newTransaction;
      });
    },
    [persist],
  );

  const resetFormState = useCallback(() => {
    const cleared: TransactionType = {
      ...defaultTransaction,
      id: Date.now(),
      type: transactionType,
      time: Date.now(),
    };
    setTransaction(cleared);
    setDateInput(formatJalaliDate(cleared.time));
    setTimeInput(formatTimeInput(cleared.time));
  }, [transactionType]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    updateTransaction({ name: e.target.value });

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = toEnglishDigits(e.target.value).replace(/\D/g, "");
    updateTransaction({ value: Number(raw || 0) });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatJalaliInput(e.target.value, dateInput);
    setDateInput(formatted);
    const timestamp = parseJalaliInput(formatted);
    if (timestamp > 0) {
      updateTransaction({
        time: mergeDateTime(transaction.time, timestamp, "date"),
      });
    }
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatTimeTyping(e.target.value, timeInput);
    setTimeInput(formatted);
    const timestamp = parseTimeInput(formatted);
    if (timestamp > 0) {
      updateTransaction({
        time: mergeDateTime(transaction.time, timestamp, "time"),
      });
    }
  };

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) =>
    updateTransaction({ note: e.target.value });

  const handleSave = async () => {
    if (!isValid) return;
    await putItem(transactionsStore, transaction);
    sessionStorage.removeItem(CREATE_TRANSACTION_KEY);
    resetFormState();
    router.back();
  };

  const handleCancel = () => {
    sessionStorage.removeItem(CREATE_TRANSACTION_KEY);
    resetFormState();
  };

  useEffect(() => {
    persist(transaction);
  }, []); // eslint-disable-line

  usePageShowSync(() => {
    const data = sessionStorage.getItem(CREATE_TRANSACTION_KEY);
    if (!data) return;
    try {
      const parsed = JSON.parse(data) as TransactionType;
      const corrected: TransactionType = { ...parsed, type: transactionType };
      setTransaction((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(corrected)) return prev;
        setDateInput(formatJalaliDate(corrected.time));
        setTimeInput(formatTimeInput(corrected.time));
        return corrected;
      });
    } catch {}
  }, [transactionType]);

  if (!transactionType) return null;

  return (
    <div className="p-7.5 grid gap-15">
      <div className="grid gap-7.5">
        <NavbarTitle
          title={
            transactionType === "debit"
              ? "دریافت جدید"
              : transactionType === "credit"
                ? "پرداخت جدید"
                : "انتقال جدید"
          }
          onClick={handleCancel}
        >
          <Capsule Icon={Left} primary={isValid} onClick={handleSave}>
            ذخیره تراکنش
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
              href={`${pathname}/account?type=fromAccount`}
              className="flex items-center justify-between h-12 w-full border border-elements-border bg-elements-background px-4 rounded-2xl text-sm active:bg-elements-background/70 transition-colors"
            >
              <span>{fromAccountName || "انتخاب حساب مبدأ"}</span>
              <Left width={16} height={16} className="fill-secondary" />
            </Link>
          </div>
        )}
        <div className="grid gap-2">
          <span className="text-xs">
            {transactionType === "transfer" ? "حساب مقصد" : "حساب"}
          </span>
          <Link
            href={`${pathname}/account?type=toAccount`}
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
              href={`${pathname}/category?type=${transactionType}`}
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
            href={tags.length ? `${pathname}/tag` : "#"}
            className="flex items-center justify-between h-12 w-full border border-elements-border bg-elements-background px-4 rounded-2xl text-sm active:bg-elements-background/70 transition-colors"
          >
            <span>{tagName ?? "نام برچسب"}</span>
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
