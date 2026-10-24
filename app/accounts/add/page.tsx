"use client";
import Capsule from "@/components/Capsule";
import NavbarTitle from "@/components/NavbarTitle";
import Left from "@/icons/Left";
import { AccountColorType, AccountType } from "@/utility/accounts/types";
import {
  jalaliToTimestamp,
  toEnglishDigits,
  toJalaliDateArray,
} from "@/utility/shared/timeMethods";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import useBalances from "@/utility/balance/service/useBalances";
import {
  formatJalaliDate,
  parseJalaliInput,
  formatJalaliInput,
} from "@/utility/shared/formatters";
import { usePageShowSync } from "@/utility/shared/usePageShowSync";
import { getAll } from "@/utility/db/Database";
import { DatabaseStores } from "@/utility/keys/database";
import AccountForm, { AccountFormValues } from "@/components/AccountForm";
import { generateUUId } from "@/utility/shared/idGenerationMethods";

export const CREATE_ACCOUNT_KEY = "new-account";

type NewAccountFormType = {
  id: string;
} & AccountFormValues;

const defaultForm: Omit<NewAccountFormType, "id"> = {
  name: "",
  type: "Bank",
  color: "black",
  initialBalance: 0,
  createTimestamp: jalaliToTimestamp(
    toJalaliDateArray(new Date()) as [number, number, number],
  ),
};

export default function AddAccount() {
  const router = useRouter();
  const { addBalance } = useBalances();
  const { accountsStore } = DatabaseStores;

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
          const updated = { ...prev, id: generateUUId() };
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
  }, [form, createInput]);

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

    const initialTxId = crypto.randomUUID();

    try {
      const res = await fetch("/api/accounts/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account: accountToSave,
          initialTransaction: {
            id: initialTxId,
            value: form.initialBalance,
            time: form.createTimestamp,
          },
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "خطا در ذخیره‌سازی");
      }

      addBalance({
        id: form.id,
        history: [{ time: form.createTimestamp, balance: form.initialBalance }],
      });

      sessionStorage.removeItem(CREATE_ACCOUNT_KEY);
      resetFormState();
      router.back();
    } catch (error) {
      console.error("Failed to save account:", error);
      alert("خطا در ذخیره‌سازی. لطفاً دوباره تلاش کنید.");
    }
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
      <AccountForm
        values={form}
        createInput={createInput}
        isValid={isValid}
        onNameChange={handleNameChange}
        onInitialBalanceChange={handleInitialBalanceChange}
        onCreateChange={handleCreateChange}
        onColorChange={handleColorChange}
      />
    </div>
  );
}
