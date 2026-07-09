"use client";
import Capsule from "@/components/Capsule";
import NavbarTitle from "@/components/NavbarTitle";
import Left from "@/icons/Left";
import { AccountTypes } from "@/utility/accounts/constants";
import { useAccounts } from "@/utility/accounts/service/useAccounts";
import { AccountColorType, AccountType } from "@/utility/accounts/types";
import useTransactions from "@/utility/transactions/service/useTransactions";
import { TransactionType } from "@/utility/transactions/types";
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
import useBalances from "@/utility/balance/service/useBalances";
import { formatJalaliDate, parseJalaliInput, formatJalaliInput } from "@/utility/shared/formatters";
import { usePageShowSync } from "@/utility/shared/usePageShowSync";

export const CREATE_ACCOUNT_KEY = "new-account";

type NewAccountType = AccountType & {
  initialBalance: number;
};

const defaultAccount: Omit<NewAccountType, "id"> = {
  name: "",
  type: "Bank",
  color: "black",
  initialBalance: 0,
  create: jalaliToTimestamp(
    toJalaliDateArray(new Date()) as [number, number, number],
  ),
};

export default function AddAccount() {
  const router = useRouter();
  const pathname = usePathname();
  const { getAccounts, addAccount } = useAccounts();
  const { addTransaction } = useTransactions();
  const { addBalance } = useBalances();

  const [account, setAccount] = useState<NewAccountType>(() => {
    if (typeof window === "undefined") return { ...defaultAccount, id: 0 };

    const data = sessionStorage.getItem(CREATE_ACCOUNT_KEY);
    try {
      const parsed = JSON.parse(data!) as Partial<NewAccountType>;
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

  const isValid = useMemo(() => {
    const nameValid = account.name.trim().length >= 3;
    const dateValid = !!account.create && account.create > 0;
    return nameValid && dateValid;
  }, [account.name, account.create]);

  const updateAccount = useCallback((updated: Partial<NewAccountType>) => {
    setAccount((prev) => {
      const newAccount = { ...prev, ...updated };
      sessionStorage.setItem(CREATE_ACCOUNT_KEY, JSON.stringify(newAccount));
      return newAccount;
    });
  }, []);

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

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => updateAccount({ name: e.target.value });
  const handleInitialBalanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = toEnglishDigits(e.target.value).replace(/\D/g, "");
    updateAccount({ initialBalance: Number(raw || 0) });
  };
  const handleCreateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatJalaliInput(e.target.value);
    setCreateInput(formatted);
    const timestamp = parseJalaliInput(formatted);
    if (timestamp > 0) updateAccount({ create: timestamp });
  };
  const handleColorChange = (color: AccountColorType) => updateAccount({ color });

  const handleSave = () => {
    if (!isValid) return;
    addAccount(account);

    const initialTransaction: TransactionType = {
      id: Date.now(),
      type: "initial",
      name: "موجودی اولیه",
      time: account.create,
      value: account.initialBalance,
      debit: account.id,
      credit: 0,
      note: "",
    } as TransactionType;

    addTransaction(initialTransaction);

    addBalance({
      id: account.id,
      history: [{ time: account.create, balance: account.initialBalance }],
    });

    sessionStorage.removeItem(CREATE_ACCOUNT_KEY);
    resetFormState();
    router.back();
  };

  const handleCancel = () => {
    sessionStorage.removeItem(CREATE_ACCOUNT_KEY);
    resetFormState();
    router.back();
  };

  useEffect(() => {
    if (getAccounts().length === 0) router.replace("/splash?from=/accounts/add");
  }, [getAccounts, router]);

  usePageShowSync(() => {
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
    } catch (e) {}
  }, []);

  if (getAccounts().length === 0) return null;

  return (
    <div className="p-7.5 grid gap-15">
      <div className="grid gap-7.5">
        <NavbarTitle title="حساب جدید" onClick={handleCancel}>
          <Capsule Icon={Left} primary={isValid} onClick={handleSave}>ذخیره حساب</Capsule>
        </NavbarTitle>
      </div>
      <div className="grid gap-10">
        <div className="grid gap-2">
          <span className="text-xs">نام حساب</span>
          <input type="text" value={account.name} onChange={handleNameChange} placeholder="بانک فلان" className="h-12 text-sm border border-elements-border bg-elements-background px-4 rounded-2xl outline-none focus:bg-primary-background focus:border-primary-border transition-all" />
        </div>
        <div className="grid gap-2">
          <span className="text-xs">نوع حساب</span>
          <Link href={`${pathname}/type`} className="flex items-center justify-between h-12 w-full border border-elements-border bg-elements-background px-4 rounded-2xl text-sm active:bg-elements-background/70 transition-colors">
            <span>{AccountTypes[account.type].name}</span>
            <Left width={16} height={16} className="fill-secondary" />
          </Link>
        </div>
        <div className="grid gap-2">
          <span className="text-xs">موجودی اولیه</span>
          <div className="relative">
            <input type="text" inputMode="numeric" value={account.initialBalance ? account.initialBalance.toLocaleString("fa-IR") : ""} onChange={handleInitialBalanceChange} placeholder="۰" className="h-12 w-full text-sm border border-elements-border bg-elements-background px-4 pl-10 rounded-2xl outline-none focus:bg-primary-background focus:border-primary-border transition-all" />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary text-[10px] pointer-events-none">﷼</span>
          </div>
        </div>
        <div className="grid gap-2">
          <span className="text-xs">تاریخ افتتاح حساب</span>
          <input type="text" inputMode="numeric" value={createInput} onChange={handleCreateChange} placeholder="۱۴۰۵/۰۱/۰۱" className="h-12 text-sm border border-elements-border bg-elements-background px-4 rounded-2xl outline-none focus:bg-primary-background focus:border-primary-border transition-all" />
        </div>
        <div className="grid gap-2">
          <span className="text-xs">رنگ حساب</span>
          <div className="grid grid-cols-4 gap-7.5 w-full p-5">
            {Object.entries(AccountColors).map(([key, color]) => (
              <button type="button" key={key} onClick={() => handleColorChange(key as AccountColorType)} className={`${color.primary} h-11 w-11 rounded-3xl cursor-pointer transition-all duration-200 justify-self-center border-4 border-transparent ${account.color === key ? "scale-90 border-white/50 shadow-2xl" : ""}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}