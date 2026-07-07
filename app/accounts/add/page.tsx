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
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { generateNextId } from "./methods";
import { AccountColors } from "@/utility/colors";

export const CREATE_ACCOUNT_KEY = "new-account";

type NewAccountType = AccountType & {
  initialBalance: number;
};

const defaultAccount: Omit<NewAccountType, "id"> = {
  name: "",
  type: "Bank",
  color: "black",
  initialBalance: 0,
  create: Date.now(),
};

export default function AddAccount() {
  const router = useRouter();
  const pathname = usePathname();
  const { getAccounts, addAccount } = useAccounts();

  const [account, setAccount] = useState<NewAccountType>(() => {
    if (typeof window === "undefined") return { ...defaultAccount, id: 0 };
    const data = sessionStorage.getItem(CREATE_ACCOUNT_KEY);
    if (!data) {
      return { ...defaultAccount, id: generateNextId(getAccounts()) };
    }
    try {
      const parsed = JSON.parse(data) as Partial<NewAccountType>;
      const id =
        parsed.id && parsed.id !== 0
          ? parsed.id
          : generateNextId(getAccounts());
      return { ...defaultAccount, ...parsed, id };
    } catch {
      return { ...defaultAccount, id: generateNextId(getAccounts()) };
    }
  });

  const [createInput, setCreateInput] = useState(() =>
    formatJalaliDate(account.create),
  );

  // ==================== Validation ====================
  const isValid = useMemo(() => {
    const nameValid = account.name.trim().length >= 3;
    const dateValid = !!account.create && account.create > 0;
    return nameValid && dateValid;
  }, [account.name, account.create]);

  // ==================== State Update & Sync ====================
  const updateAccount = useCallback((updated: Partial<NewAccountType>) => {
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
    if (raw.length !== 8) return Date.now();

    const year = parseInt(raw.slice(0, 4), 10);
    const month = parseInt(raw.slice(4, 6), 10);
    const day = parseInt(raw.slice(6, 8), 10);

    if (year >= 1300 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return jalaliToTimestamp([year, month, day]);
    }
    return Date.now();
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

  // ==================== Reset Form ====================
  const resetFormState = useCallback(() => {
    const newId = generateNextId(getAccounts());
    const clearedAccount = {
      ...defaultAccount,
      id: newId,
      create: Date.now(),
    };

    setAccount(clearedAccount);
    setCreateInput(formatJalaliDate(clearedAccount.create));
  }, [getAccounts]);

  // ==================== Handlers ====================
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateAccount({ name: e.target.value });
  };

  const handleInitialBalanceChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const raw = toEnglishDigits(e.target.value).replace(/\D/g, "");
    updateAccount({ initialBalance: Number(raw || 0) });
  };

  const handleCreateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCreateInput(e.target.value);
    setCreateInput(formatted);
    updateAccount({ create: parseJalaliInput(formatted) });
  };

  const handleColorChange = (color: AccountColorType) => {
    updateAccount({ color });
  };

  const handleSave = () => {
    if (!isValid) return;

    addAccount(account);
    sessionStorage.removeItem(CREATE_ACCOUNT_KEY);
    resetFormState();
    
    // برگشت به صفحه قبل با استفاده از روتر بومی Next.js
    router.back();
  };

  const handleCancel = () => {
    sessionStorage.removeItem(CREATE_ACCOUNT_KEY);
    resetFormState();
    
    // برگشت به صفحه قبل با استفاده از روتر بومی Next.js
    router.back();
  };

  // ==================== Effects ====================
  useEffect(() => {
    if (getAccounts().length === 0) {
      router.replace("/splash");
    }
  }, [getAccounts, router]);

  useEffect(() => {
    const handleFocus = () => {
      const data = sessionStorage.getItem(CREATE_ACCOUNT_KEY);
      if (!data) return;

      try {
        const parsed = JSON.parse(data) as NewAccountType;
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

  if (getAccounts().length === 0) return null;

  return (
    <div className="p-7.5 grid gap-15">
      <div className="grid gap-7.5">
        <NavbarTitle title="حساب جدید" onClick={handleCancel}>
          <Capsule Icon={Left} primary={isValid} onClick={handleSave}>
            ذخیره حساب
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
            href={`${pathname}/type`}
            className="flex items-center justify-between h-12 w-full border border-elements-border bg-elements-background px-4 rounded-2xl text-sm active:bg-elements-background/70 transition-colors"
          >
            <span>{AccountTypes[account.type].name}</span>
            <Left width={16} height={16} className="fill-secondary" />
          </Link>
        </div>

        <div className="grid gap-2">
          <span className="text-xs">موجودی اولیه</span>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              value={
                account.initialBalance
                  ? account.initialBalance.toLocaleString("fa-IR")
                  : ""
              }
              onChange={handleInitialBalanceChange}
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
                  transition-all justify-self-center
                  ${account.color === key ? "scale-110 ring-2 ring-white/50" : "hover:scale-110"}
                `}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}