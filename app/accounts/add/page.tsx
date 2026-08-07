"use client";

import Capsule from "@/components/Capsule";
import NavbarTitle from "@/components/NavbarTitle";
import Left from "@/icons/Left";
import { AccountTypes } from "@/utility/shared/accountsTypes";
import { AccountColorType, AccountType } from "@/utility/accounts/types";
import { TransactionType } from "@/utility/transactions/types";
import {
  jalaliToTimestamp,
  toEnglishDigits,
  toJalaliDateArray,
} from "@/utility/shared/timeMethods";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AccountColors } from "@/utility/shared/colors";
import useBalances from "@/utility/balance/service/useBalances";
import {
  formatJalaliDate,
  parseJalaliInput,
  formatJalaliInput,
} from "@/utility/shared/formatters";
import { usePageShowSync } from "@/utility/shared/usePageShowSync";
import { getAll, putItem } from "@/utility/db/Database";
import { DatabaseStores } from "@/utility/keys/database";

export const CREATE_ACCOUNT_KEY = "new-account";

type NewAccountFormType = {
  id: string;
  name: string;
  type: AccountType["type"];
  color: AccountColorType;
  initialBalance: number;
  order: number;
  createTimestamp: number;
};

const defaultForm: Omit<NewAccountFormType, "id"> = {
  name: "",
  type: "Bank",
  color: "black",
  initialBalance: 0,
  order: 0,
  createTimestamp: jalaliToTimestamp(
    toJalaliDateArray(new Date()) as [number, number, number],
  ),
};

export default function AddAccount() {
  const router = useRouter();
  const pathname = usePathname();
  const { addBalance } = useBalances();
  const { accountsStore, transactionsStore } = DatabaseStores;

  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState<NewAccountFormType>(() => {
    if (typeof window === "undefined") return { ...defaultForm, id: "" };
    const data = sessionStorage.getItem(CREATE_ACCOUNT_KEY);
    try {
      const parsed = JSON.parse(data!) as Partial<NewAccountFormType>;
      const id = parsed.id && parsed.id !== "" ? parsed.id : "";
      return { ...defaultForm, ...parsed, id };
    } catch {
      return { ...defaultForm, id: "" };
    }
  });
  const [createInput, setCreateInput] = useState(() =>
    formatJalaliDate(form.createTimestamp),
  );

  useEffect(() => {
    async function load() {
      const accounts = (await getAll(accountsStore)) as AccountType[];
      if (accounts.length === 0) {
        router.replace("/splash?from=/accounts/add");
        return;
      }
      setForm((prev) => {
        if (prev.id === "") {
          const updated = { ...prev, id: crypto.randomUUID() };
          sessionStorage.setItem(CREATE_ACCOUNT_KEY, JSON.stringify(updated));
          return updated;
        }
        return prev;
      });
      setIsLoading(false);
    }
    load();
  }, [accountsStore, router]);

  const isValid = useMemo(() => {
    const nameValid = form.name.trim().length >= 3;
    const dateValid = createInput.trim().length === 10;
    const typeValid = !!form.type;
    const colorValid = !!form.color;
    return nameValid && dateValid && typeValid && colorValid;
  }, [form.name, createInput, form.type, form.color]);

  const updateForm = useCallback((updated: Partial<NewAccountFormType>) => {
    setForm((prev) => {
      const newForm = { ...prev, ...updated };
      sessionStorage.setItem(CREATE_ACCOUNT_KEY, JSON.stringify(newForm));
      return newForm;
    });
  }, []);

  const resetFormState = useCallback(() => {
    const clearedForm: NewAccountFormType = {
      ...defaultForm,
      id: crypto.randomUUID(),
      createTimestamp: Date.now(),
    };
    setForm(clearedForm);
    setCreateInput(formatJalaliDate(clearedForm.createTimestamp));
  }, []);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    updateForm({ name: e.target.value });

  const handleInitialBalanceChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const raw = toEnglishDigits(e.target.value).replace(/\D/g, "");
    updateForm({ initialBalance: Number(raw || 0) });
  };

  const handleCreateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatJalaliInput(e.target.value, createInput);
    setCreateInput(formatted);
    const timestamp = parseJalaliInput(formatted);
    if (timestamp > 0) updateForm({ createTimestamp: timestamp });
  };

  const handleColorChange = (color: AccountColorType) => updateForm({ color });

  const handleSave = async () => {
    if (!isValid) return;

    const accounts = (await getAll(accountsStore)) as AccountType[];
    const maxOrder = accounts.reduce(
      (max, a) => Math.max(max, a.order ?? 0),
      0,
    );

    const accountToSave: AccountType = {
      id: form.id,
      name: form.name,
      type: form.type,
      color: form.color,
      order: maxOrder + 1,
    };
    await putItem(accountsStore, accountToSave);

    const initialTransaction: TransactionType = {
      id: crypto.randomUUID(),
      type: "initial",
      name: "موجودی اولیه",
      time: form.createTimestamp,
      value: form.initialBalance,
      debit: form.id,
      credit: "",
    } as TransactionType;
    await putItem(transactionsStore, initialTransaction);

    addBalance({
      id: form.id,
      history: [{ time: form.createTimestamp, balance: form.initialBalance }],
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

  usePageShowSync(() => {
    const data = sessionStorage.getItem(CREATE_ACCOUNT_KEY);
    if (!data) return;
    try {
      const parsed = JSON.parse(data) as NewAccountFormType;
      setForm((prev) => {
        if (JSON.stringify(prev) !== JSON.stringify(parsed)) {
          setCreateInput(formatJalaliDate(parsed.createTimestamp));
          return parsed;
        }
        return prev;
      });
    } catch (e) {}
  }, []);

  if (isLoading) return null;

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
            value={form.name}
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
            <span>{AccountTypes[form.type].name}</span>
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
                form.initialBalance
                  ? form.initialBalance.toLocaleString("fa-IR")
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
                className={`${color.primary} h-11 w-11 rounded-3xl cursor-pointer transition-all duration-200 justify-self-center border-4 border-transparent ${form.color === key ? "scale-90 border-white/50 shadow-2xl" : ""}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
