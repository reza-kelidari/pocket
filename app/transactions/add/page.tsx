"use client";

import Capsule from "@/components/Capsule";
import NavbarTitle from "@/components/NavbarTitle";
import Left from "@/icons/Left";
import { TransactionType } from "@/utility/shared/transactionTypes";
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
import { TagType } from "@/utility/shared/tagTypes";
import { DatabaseStores } from "@/utility/keys/database";
import { generateUUId } from "@/utility/shared/idGenerationMethods";
import { useAccountsAndTransactions } from "@/utility/shared/useAccountsAndTransactions";

export const CREATE_TRANSACTION_KEY = "new-transaction";

const createBlankTransaction = (
  type: TransactionType["type"],
): TransactionType => ({
  id: generateUUId(),
  type,
  name: "",
  time: Date.now(),
  value: 0,
  debit: "",
  credit: "",
  note: "",
});

/**
 * Loads the transaction draft from session storage or creates a new one.
 * FIX: If the transaction type has changed, create a fresh draft to prevent
 * field pollution (e.g., a category ID from a 'debit' transaction being
 * misinterpreted as an account ID in a 'transfer' transaction).
 */
const loadDraft = (type: TransactionType["type"]): TransactionType => {
  if (typeof window === "undefined") return createBlankTransaction(type);

  const data = sessionStorage.getItem(CREATE_TRANSACTION_KEY);
  if (data) {
    try {
      const parsed = JSON.parse(data) as TransactionType;
      if (parsed.id && parsed.type === type) {
        return parsed;
      }
    } catch {}
  }

  const newDraft = createBlankTransaction(type);
  sessionStorage.setItem(CREATE_TRANSACTION_KEY, JSON.stringify(newDraft));
  return newDraft;
};

export default function AddTransaction() {
  const searchParams = useSearchParams();
  const transactionType = searchParams.get("type") as TransactionType["type"];
  const router = useRouter();
  const pathname = usePathname();
  const [tags, setTags] = useState<TagType[]>([]);
  const [accounts, setAccounts] = useState<AccountType[]>([]);
  const { accountsStore, transactionsStore, tagsStore } = DatabaseStores;
  const fetchAll = useAccountsAndTransactions();

  const [transaction, setTransaction] = useState<TransactionType>(() =>
    createBlankTransaction(transactionType || "credit"),
  );

  const [dateInput, setDateInput] = useState("");
  const [timeInput, setTimeInput] = useState("");

  useEffect(() => {
    if (!transactionType) {
      router.replace("/");
      return;
    }

    const draft = loadDraft(transactionType);
    setTransaction(draft);
    setDateInput(formatJalaliDate(draft.time));
    setTimeInput(formatTimeInput(draft.time));

    async function loadInitialData() {
      const accs = await getAll<AccountType>(accountsStore);
      setAccounts(accs);
      setTags(await getAll<TagType>(tagsStore));
      if (accs.length === 0) {
        router.replace(
          `/splash?from=/transactions/add?type=${transactionType}`,
        );
      }
    }
    loadInitialData();
  }, [router, transactionType, accountsStore, tagsStore]);

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
    return null;
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
    const nameValid =
      transaction.type === "transfer"
        ? true
        : transaction.name.trim().length >= 3;
    const valueValid = transaction.value > 0;
    const dateValid = dateInput.trim().length === 10;
    const timeValid = timeInput.trim().length === 5;

    let accountAndCategoryValid = false;
    if (transaction.type === "transfer") {
      accountAndCategoryValid =
        !!transaction.debit &&
        !!transaction.credit &&
        transaction.debit !== transaction.credit;
    } else if (transaction.type === "debit" || transaction.type === "credit") {
      accountAndCategoryValid = !!transaction.debit && !!transaction.credit;
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
    if (!transactionType) return;
    const newDraft = createBlankTransaction(transactionType);
    persist(newDraft);
    setTransaction(newDraft);
    setDateInput(formatJalaliDate(newDraft.time));
    setTimeInput(formatTimeInput(newDraft.time));
  }, [transactionType, persist]);

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
    if (timestamp > 0)
      updateTransaction({
        time: mergeDateTime(transaction.time, timestamp, "date"),
      });
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatTimeTyping(e.target.value, timeInput);
    setTimeInput(formatted);
    const timestamp = parseTimeInput(formatted);
    if (timestamp > 0)
      updateTransaction({
        time: mergeDateTime(transaction.time, timestamp, "time"),
      });
  };

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) =>
    updateTransaction({ note: e.target.value });

  const handleSave = async () => {
    if (!isValid) return;
    await putItem(transactionsStore, transaction);
    await fetchAll();
    sessionStorage.removeItem(CREATE_TRANSACTION_KEY);
    resetFormState();
    router.back();
  };

  const handleCancel = () => {
    sessionStorage.removeItem(CREATE_TRANSACTION_KEY);
    resetFormState();
  };

  /**
   * Syncs the form state with session storage when the page becomes visible.
   * FIX: Removed manual type override. sessionStorage is now the single source
   * of truth and is guaranteed to have the correct type thanks to loadDraft.
   */
  usePageShowSync(() => {
    const data = sessionStorage.getItem(CREATE_TRANSACTION_KEY);
    if (!data) return;
    try {
      const parsed = JSON.parse(data) as TransactionType;
      setTransaction((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(parsed)) return prev;
        setDateInput(formatJalaliDate(parsed.time));
        setTimeInput(formatTimeInput(parsed.time));
        return parsed;
      });
    } catch {}
  }, [transactionType]);

  const isTransferFromEmpty =
    transactionType === "transfer" && !transaction.credit;

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
        {transactionType !== "transfer" && (
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
        )}
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
            href={
              isTransferFromEmpty ? "#" : `${pathname}/account?type=toAccount`
            }
            className={`flex items-center justify-between h-12 w-full border border-elements-border bg-elements-background px-4 rounded-2xl text-sm transition-colors ${
              isTransferFromEmpty
                ? "pointer-events-none opacity-50"
                : "active:bg-elements-background/70"
            }`}
            onClick={(e) => {
              if (isTransferFromEmpty) {
                e.preventDefault();
              }
            }}
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
