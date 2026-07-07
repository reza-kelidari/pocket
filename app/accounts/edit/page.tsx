"use client";
import Capsule from "@/components/Capsule";
import NavbarTitle from "@/components/NavbarTitle";
import Left from "@/icons/Left";
import { AccountTypes } from "@/utility/accounts/constants";
import { useAccounts } from "@/utility/accounts/service/useAccounts";
import { AccountColorType, AccountType } from "@/utility/accounts/types";
import {
  jalaliToTimestamp,
  toEnglishDigits,
  toJalaliDateArray,
} from "@/utility/time/methods";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AccountColors } from "@/utility/colors";
import { CREATE_ACCOUNT_KEY } from "../add/page";
import useTransactions from "@/utility/transactions/service/useTransactions";
import { TransactionType } from "@/utility/transactions/types";
import useBalances from "@/utility/balance/service/useBalances";
import { getAccountBalanceHistory } from "@/utility/balance/methods";

const defaultAccount: AccountType = {
  id: 0,
  name: "",
  type: "Bank",
  color: "black",
  create: Date.now(),
};

export default function AccountEdit() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const accountID = Number(searchParams.get("id"));
  const { getAccounts, updateAccount } = useAccounts();
  const { transactions, updateTransaction, addTransaction } = useTransactions();
  const { updateBalance } = useBalances();

  const existingAccount = getAccounts().find((item) => item.id === accountID);

  const [account, setAccount] = useState<AccountType>(() => {
    const data = sessionStorage.getItem(CREATE_ACCOUNT_KEY);

    if (data) {
      const parsed = JSON.parse(data) as AccountType;
      if (parsed.id === accountID) {
        return { ...defaultAccount, ...parsed };
      }
    }

    const loadedAccount: AccountType = {
      ...defaultAccount,
      ...existingAccount,
      id: accountID,
    };

    sessionStorage.setItem(CREATE_ACCOUNT_KEY, JSON.stringify(loadedAccount));
    return loadedAccount;
  });

  const [createInput, setCreateInput] = useState(() =>
    formatJalaliDate(account.create),
  );

  // ==================== اصلاح این بخش ====================
  // خواندن مقدار موجودی اولیه فقط یک بار هنگام لود صفحه
  const [initialBalance, setInitialBalance] = useState(() => {
    const tx = transactions.find(
      (item) => item.type === "initial" && item.debit === accountID,
    );
    return tx?.value ?? 0;
  });
  // ======================================================

  // ==================== Validation ====================
  const isValid = useMemo(() => {
    const nameValid = account.name.trim().length >= 3;
    const dateValid = !!account.create && account.create > 0;
    return nameValid && dateValid;
  }, [account.name, account.create]);

  // ==================== State Update & Sync ====================
  const updateAccountState = useCallback((updated: Partial<AccountType>) => {
    setAccount((prev) => {
      const newAccount = { ...prev, ...updated };
      sessionStorage.setItem(CREATE_ACCOUNT_KEY, JSON.stringify(newAccount));
      return newAccount;
    });
  }, []);

  // ==================== Date Helpers ====================
  function formatJalaliDate(timestamp: number): string {
    const date = new Date(timestamp);
    const [year, month, day] = toJalaliDateArray(date);
    const result = `${year}/${month.toString().padStart(2, "0")}/${day.toString().padStart(2, "0")}`;
    return result.replace(/\d/g, (d) => Number(d).toLocaleString("fa-IR"));
  }

  const parseJalaliInput = (formattedValue: string): number => {
    const raw = toEnglishDigits(formattedValue).replace(/\D/g, "");
    if (raw.length !== 8) return 0;

    const year = parseInt(raw.slice(0, 4), 10);
    const month = parseInt(raw.slice(4, 6), 10);
    const day = parseInt(raw.slice(6, 8), 10);

    if (year >= 1300 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return jalaliToTimestamp([year, month, day]);
    }
    return 0;
  };

  const formatCreateInput = (value: string): string => {
    const digits = toEnglishDigits(value).replace(/\D/g, "").slice(0, 8);
    let result = "";
    for (let i = 0; i < digits.length; i++) {
      if (i === 4 || i === 6) result += "/";
      result += digits[i];
    }
    return result.replace(/\d/g, (d) => Number(d).toLocaleString("fa-IR"));
  };

  // ==================== Handlers ====================
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateAccountState({ name: e.target.value });
  };

  function handleInitialChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = toEnglishDigits(e.target.value).replace(/\D/g, "");
    setInitialBalance(Number(raw || 0));
  }

  const handleCreateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCreateInput(e.target.value);
    setCreateInput(formatted);
    const timestamp = parseJalaliInput(formatted);
    if (timestamp > 0) {
      updateAccountState({ create: timestamp });
    }
  };

  const handleColorChange = (color: AccountColorType) => {
    updateAccountState({ color });
  };

  const handleSave = () => {
    if (!isValid) return;

    updateAccount(account);

    const initialTx = transactions.find(
      (t) => t.type === "initial" && t.debit === account.id,
    );

    let finalTx: TransactionType;

    if (initialTx) {
      finalTx = {
        ...initialTx,
        value: initialBalance,
        time: account.create,
      };
      updateTransaction(finalTx);
    } else {
      finalTx = {
        id: Date.now(),
        type: "initial",
        name: "موجودی اولیه",
        time: account.create,
        value: initialBalance,
        debit: account.id,
        credit: 0,
        note: "",
      } as TransactionType;
      addTransaction(finalTx);
    }

    const accountTxs = transactions
      .filter((t) => t.debit === account.id || t.credit === account.id)
      .map((t) => (t.id === finalTx.id ? finalTx : t));

    const updatedBalance = getAccountBalanceHistory(accountTxs, account.id);
    updateBalance(updatedBalance);

    sessionStorage.removeItem(CREATE_ACCOUNT_KEY);
    router.back();
  };

  const handleCancel = () => {
    sessionStorage.removeItem(CREATE_ACCOUNT_KEY);
    router.back();
  };

  // ==================== Effects ====================
  useEffect(() => {
    if (getAccounts().length === 0) {
      const currentPath = window.location.pathname + window.location.search;
      router.replace(`/splash?from=${encodeURIComponent(currentPath)}`);
    } else if (!existingAccount && accountID) {
      router.replace("/accounts");
    }
    // بخش else و setInitialBalance کاملا حذف شد
  }, [getAccounts, router, existingAccount, accountID]);

  useEffect(() => {
    const handleFocus = () => {
      const data = sessionStorage.getItem(CREATE_ACCOUNT_KEY);
      if (!data) return;

      try {
        const parsed = JSON.parse(data) as AccountType;
        setAccount((prev) => {
          if (JSON.stringify(prev) !== JSON.stringify(parsed)) {
            setCreateInput(formatJalaliDate(parsed.create));
            return parsed;
          }
          return prev;
        });
      } catch (e) {
        console.error("Failed to parse account data", e);
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  if (getAccounts().length === 0 || !existingAccount) return null;

  return (
    <div className="p-7.5 grid gap-15">
      <div className="grid gap-7.5">
        <NavbarTitle title="ویرایش حساب" onClick={handleCancel}>
          <Capsule Icon={Left} primary={isValid} onClick={handleSave}>
            ذخیره تغییرات
          </Capsule>
        </NavbarTitle>
      </div>

      <div className="grid gap-10">
        <div className="grid gap-2">
          <span className="text-xs">نام حساب</span>
          <input
            type="text"
            value={account.name}
            onChange={handleNameChange}
            placeholder="بانک فلان"
            className="h-12 text-sm border border-elements-border bg-elements-background px-4 rounded-2xl outline-none focus:bg-primary-background focus:border-primary-border transition-all"
          />
        </div>

        <div className="grid gap-2">
          <span className="text-xs">نوع حساب</span>
          <Link
            href={!account.default ? `/accounts/add/type` : "#"}
            className="flex items-center justify-between h-12 w-full border border-elements-border bg-elements-background px-4 rounded-2xl text-sm active:bg-elements-background/70 transition-colors"
          >
            <span className={`${account.default && "text-secondary"}`}>
              {AccountTypes[account.type].name}
            </span>
            {!account.default && (
              <Left width={16} height={16} className="fill-secondary" />
            )}
          </Link>
        </div>

        <div className="grid gap-2">
          <span className="text-xs">موجودی اولیه</span>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              value={
                initialBalance ? initialBalance.toLocaleString("fa-IR") : ""
              }
              onChange={handleInitialChange}
              placeholder="۰"
              className="h-12 w-full text-sm border border-elements-border bg-elements-background px-4 pl-10 rounded-2xl outline-none focus:bg-primary-background focus:border-primary-border transition-all"
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary text-[10px] pointer-events-none">
              ﷼
            </span>
          </div>
        </div>

        <div className="grid gap-2">
          <span className="text-xs">تاریخ افتتاح حساب</span>
          <input
            type="text"
            inputMode="numeric"
            value={createInput}
            onChange={handleCreateChange}
            placeholder="۱۴۰۵/۰۱/۰۱"
            className="h-12 text-sm border border-elements-border bg-elements-background px-4 rounded-2xl outline-none focus:bg-primary-background focus:border-primary-border transition-all"
          />
        </div>

        <div className="grid gap-2">
          <span className="text-xs">رنگ حساب</span>
          <div className="grid grid-cols-4 gap-7.5 w-full p-5">
            {Object.entries(AccountColors).map(([key, color]) => (
              <button
                type="button"
                key={key}
                onClick={() => handleColorChange(key as AccountColorType)}
                aria-label={`انتخاب رنگ ${key}`}
                className={`
                  ${color.primary}
                  h-11 w-11 rounded-3xl cursor-pointer
                  transition-all duration-200 justify-self-center
                  border-4 border-transparent
                  ${account.color === key ? "scale-90 border-white/50 shadow-2xl" : ""}
                `}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
