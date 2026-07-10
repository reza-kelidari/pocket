"use client";

import Capsule from "@/components/Capsule";
import NavbarTitle from "@/components/NavbarTitle";
import Left from "@/icons/Left";
import { TransactionType } from "@/utility/transactions/types";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
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
import { CREATE_TRANSACTION_KEY } from "../add/page";
import { toEnglishDigits } from "@/utility/shared/timeMethods";
import { TagType } from "@/utility/shared/tagTypes";
import { getAll, getItem, putItem } from "@/utility/db/Database";
import { AccountType } from "@/utility/accounts/types";
import { DatabaseStores } from "@/utility/keys/database";

export default function TransactionEdit() {
  const searchParams = useSearchParams();
  const txID = searchParams.get("id");
  const router = useRouter();
  const { accountsStore, transactionsStore, tagsStore } = DatabaseStores;

  const [accounts, setAccounts] = useState<AccountType[]>([]);
  const [tags, setTags] = useState<TagType[]>([]);

  const [transaction, setTransaction] = useState<TransactionType | null>(null);
  const [dateInput, setDateInput] = useState("");
  const [timeInput, setTimeInput] = useState("");

  // ==================== State Update & Sync ====================
  const persist = useCallback((data: TransactionType) => {
    sessionStorage.setItem(CREATE_TRANSACTION_KEY, JSON.stringify(data));
  }, []);

  // ==================== Initial Data Load ====================
  useEffect(() => {
    if (!txID) {
      router.replace("/transactions");
      return;
    }

    async function loadInitialData() {
      try {
        const draftData = sessionStorage.getItem(CREATE_TRANSACTION_KEY);
        let initialTx: TransactionType | null = null;

        if (draftData) {
          try {
            const parsed = JSON.parse(draftData) as TransactionType;
            if (parsed.id === Number(txID)) initialTx = parsed;
          } catch {}
        }

        if (!initialTx) {
          initialTx =
            (await getItem<TransactionType>(transactionsStore, Number(txID))) ??
            null;
        }

        if (!initialTx) {
          router.replace("/transactions");
          return;
        }

        persist(initialTx);

        setTransaction(initialTx);
        setDateInput(formatJalaliDate(initialTx.time));
        setTimeInput(formatTimeInput(initialTx.time));

        const [accs, tgs] = await Promise.all([
          getAll<AccountType>(accountsStore),
          getAll<TagType>(tagsStore),
        ]);

        accs.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

        setAccounts(accs);
        setTags(tgs);
      } catch (error) {
        console.error("Failed to load transaction data:", error);
        router.replace("/transactions");
      }
    }

    loadInitialData();
  }, [txID, router, accountsStore, transactionsStore, tagsStore, persist]);

  const transactionType = transaction?.type;

  // ==================== Derived States ====================
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

  const tagName = useMemo(() => {
    if (!transaction || !transaction.tag) return "";
    return tags.find((item) => item.id === transaction.tag)?.name ?? "";
  }, [transaction, tags]);

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
  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) =>
    updateTransactionState({ name: e.target.value });

  const handleValueChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = toEnglishDigits(e.target.value).replace(/\D/g, "");
    updateTransactionState({ value: Number(raw || 0) });
  };

  const handleDateChange = (e: ChangeEvent<HTMLInputElement>) => {
    const formatted = formatJalaliInput(e.target.value, dateInput);
    setDateInput(formatted);
    const timestamp = parseJalaliInput(formatted);
    if (timestamp > 0 && transaction) {
      updateTransactionState({
        time: mergeDateTime(transaction.time, timestamp, "date"),
      });
    }
  };

  const handleTimeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const formatted = formatTimeTyping(e.target.value, timeInput);
    setTimeInput(formatted);
    const timestamp = parseTimeInput(formatted);
    if (timestamp > 0 && transaction) {
      updateTransactionState({
        time: mergeDateTime(transaction.time, timestamp, "time"),
      });
    }
  };

  const handleNoteChange = (e: ChangeEvent<HTMLTextAreaElement>) =>
    updateTransactionState({ note: e.target.value });

  const handleSave = async () => {
    if (!isValid || !transaction) return;
    await putItem(transactionsStore, transaction);
    sessionStorage.removeItem(CREATE_TRANSACTION_KEY);
    router.back();
  };

  const handleCancel = () => {
    sessionStorage.removeItem(CREATE_TRANSACTION_KEY);
    router.back();
  };

  // ==================== Page Show Sync (برای برگشت از صفحات انتخاب) ====================
  usePageShowSync(() => {
    const data = sessionStorage.getItem(CREATE_TRANSACTION_KEY);
    if (!data || !txID) return;
    try {
      const parsed = JSON.parse(data) as TransactionType;
      if (parsed.id !== Number(txID)) return;
      setTransaction((prev) => {
        if (!prev || JSON.stringify(prev) === JSON.stringify(parsed))
          return prev;
        setDateInput(formatJalaliDate(parsed.time));
        setTimeInput(formatTimeInput(parsed.time));
        return parsed;
      });
    } catch {}
  }, [txID]);

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
            href={tags.length ? "/transactions/add/tag" : "#"}
            className="flex items-center justify-between h-12 w-full border border-elements-border bg-elements-background px-4 rounded-2xl text-sm active:bg-elements-background/70 transition-colors"
          >
            <span>{tagName || "نام برچسب"}</span>
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
