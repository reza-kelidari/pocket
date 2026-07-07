"use client";
import Capsule from "@/components/Capsule";
import NavbarTitle from "@/components/NavbarTitle";
import Left from "@/icons/Left";
import { AccountTypes } from "@/utility/accounts/constants";
import { useAccounts } from "@/utility/accounts/service/useAccounts";
import { AccountColorType, AccountType } from "@/utility/accounts/types";
import { useRedirect } from "@/utility/redirect/service/useRedirect";
import {
  jalaliToTimestamp,
  toEnglishDigits,
  toJalaliDateArray,
} from "@/utility/time/methods";
import Link from "next/link";
import { redirect, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const { add, back } = useRedirect();
  const { getAccounts, addAccount } = useAccounts();

  const [account, setAccount] = useState<NewAccountType>({
    ...defaultAccount,
    id: 0,
  });
  const [createInput, setCreateInput] = useState("");

  const isFirstLoad = useRef(true);

  // ==================== Validation ====================
  const isValid = useMemo(() => {
    const nameValid = account.name.trim().length >= 3;
    const dateValid = !!account.create && account.create > 0;
    return nameValid && dateValid;
  }, [account.name, account.create]);

  // ==================== Load Account ====================
  const loadAccount = useCallback((): NewAccountType => {
    const data = sessionStorage.getItem(CREATE_ACCOUNT_KEY);
    if (!data) {
      const newId = generateNextId(getAccounts());
      return { ...defaultAccount, id: newId };
    }

    try {
      const parsed = JSON.parse(data) as Partial<NewAccountType>;
      const id =
        parsed.id && parsed.id !== 0
          ? parsed.id
          : generateNextId(getAccounts());

      return {
        ...defaultAccount,
        ...parsed,
        id,
      };
    } catch {
      const newId = generateNextId(getAccounts());
      return { ...defaultAccount, id: newId };
    }
  }, [getAccounts]);

  const saveAccount = useCallback(
    (updated: Partial<NewAccountType>) => {
      const newAccount = { ...account, ...updated };
      sessionStorage.setItem(CREATE_ACCOUNT_KEY, JSON.stringify(newAccount));
      setAccount(newAccount);
    },
    [account],
  );

  // ==================== Date Helpers ====================
  const formatJalaliDate = useCallback((timestamp: number): string => {
    const date = new Date(timestamp);
    const [year, month, day] = toJalaliDateArray(date);
    let result = `${year}/${month.toString().padStart(2, "0")}/${day.toString().padStart(2, "0")}`;
    return result.replace(/\d/g, (d) => Number(d).toLocaleString("fa-IR"));
  }, []);

  const parseJalaliInput = (formattedValue: string): number => {
    const raw = toEnglishDigits(formattedValue).replace(/\D/g, "");
    if (raw.length !== 8) return Date.now();

    const year = parseInt(raw.slice(0, 4));
    const month = parseInt(raw.slice(4, 6));
    const day = parseInt(raw.slice(6, 8));

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

  // ==================== Handlers ====================
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    saveAccount({ name: e.target.value });
  };

  const handleInitialBalanceChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const raw = toEnglishDigits(e.target.value).replace(/\D/g, "");
    saveAccount({ initialBalance: Number(raw || 0) });
  };

  const handleCreateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCreateInput(e.target.value);
    setCreateInput(formatted);
    saveAccount({ create: parseJalaliInput(formatted) });
  };

  const handleColorChange = (color: AccountColorType) => {
    saveAccount({ color });
  };

  const handleSave = () => {
    if (!isValid) return;

    addAccount(account);
    handleBack();
    back();
  };

  const handleBack = () => {
    sessionStorage.removeItem(CREATE_ACCOUNT_KEY);
  };

  useEffect(() => {
    if (getAccounts().length === 0) {
      router.replace("/splash");
    }
  }, [getAccounts, router]);

  useEffect(() => {
    add(window.location.pathname + window.location.search);
  }, [add]);

  // بارگذاری فقط یکبار + هنگام بازگشت از صفحه نوع
  useEffect(() => {
    if (!isFirstLoad.current) return; // جلوگیری از لوپ

    const loaded = loadAccount();
    setAccount(loaded);
    setCreateInput(formatJalaliDate(loaded.create));

    isFirstLoad.current = false;
  }, [loadAccount, formatJalaliDate]);

  // تشخیص بازگشت از صفحه نوع (با استفاده از visibility)
  useEffect(() => {
    const handleFocus = () => {
      const loaded = loadAccount();
      setAccount(loaded);
      setCreateInput(formatJalaliDate(loaded.create));
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [loadAccount, formatJalaliDate]);

  if (getAccounts().length === 0) return null;

  return (
    <div className="p-7.5 grid gap-15">
      <div className="grid gap-7.5">
        <NavbarTitle title="حساب جدید" onClick={handleBack}>
          <Capsule
            Icon={Left}
            primary={isValid}
            onClick={handleSave}
            href={isValid ? "/accounts" : "#"}
          >
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
            href={`${window.location.pathname}/type`}
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
              <span
                key={key}
                onClick={() => handleColorChange(key as AccountColorType)}
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
