"use client";
import Capsule from "@/components/Capsule";
import CapsuleLoading from "@/components/Skeletons/CapsuleLoading";
import NavbarTitle from "@/components/NavbarTitle";
import Left from "@/icons/Left";
import { AccountColorType, AccountType } from "@/utility/accounts/types";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CREATE_ACCOUNT_KEY } from "../add/page";
import { TransactionType } from "@/utility/shared/transactionTypes";
import useBalances from "@/utility/balance/service/useBalances";
import { getAccountBalanceHistory } from "@/utility/shared/balancesMethods";
import { toEnglishDigits } from "@/utility/shared/timeMethods";
import {
  formatJalaliDate,
  parseJalaliInput,
  formatJalaliInput,
} from "@/utility/shared/formatters";
import { usePageShowSync } from "@/utility/shared/usePageShowSync";
import { getAll, putItem } from "@/utility/db/Database";
import { DatabaseStores } from "@/utility/keys/database";
import { generateUUId } from "@/utility/shared/idGenerationMethods";
import AccountForm, { AccountFormValues } from "@/components/AccountForm";

const defaultAccount: AccountType = {
  id: generateUUId(),
  name: "",
  type: "Bank",
  color: "black",
  order: 0,
};

export default function AccountEdit() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const accountID = searchParams.get("id");
  const { updateBalance } = useBalances();
  const { accountsStore, transactionsStore } = DatabaseStores;

  const [isLoading, setIsLoading] = useState(true);
  const [account, setAccount] = useState<AccountType | null>(null);
  const [createInput, setCreateInput] = useState("");
  const [formValues, setFormValues] = useState<AccountFormValues>({
    name: "",
    type: "Bank",
    color: "black",
    initialBalance: 0,
    createTimestamp: 0,
  });

  useEffect(() => {
    async function load() {
      const accounts = (await getAll(accountsStore)) as AccountType[];
      if (accounts.length === 0) {
        const currentPath = window.location.pathname + window.location.search;
        router.replace(`/splash?from=${encodeURIComponent(currentPath)}`);
        return;
      }
      const existingAccount = accounts.find((item) => item.id === accountID);
      if (!existingAccount) {
        router.replace("/accounts");
        return;
      }
      const data = sessionStorage.getItem(CREATE_ACCOUNT_KEY);
      let initialAcc: AccountType = existingAccount;
      if (data) {
        try {
          const parsed = JSON.parse(data) as AccountType;
          if (parsed.id === accountID)
            initialAcc = { ...defaultAccount, ...parsed };
        } catch {}
      }
      setAccount(initialAcc);

      const transactions = (await getAll(
        transactionsStore,
      )) as TransactionType[];
      const initialTx = transactions.find(
        (t) => t.type === "initial" && t.debit === accountID,
      );

      const createTimestamp = initialTx
        ? Number(initialTx.time) || 0
        : Date.now();
      const initialBalance = initialTx ? Number(initialTx.value) || 0 : 0;

      setFormValues({
        name: initialAcc.name,
        type: initialAcc.type,
        color: initialAcc.color,
        initialBalance,
        createTimestamp,
      });
      setCreateInput(formatJalaliDate(createTimestamp));
      setIsLoading(false);
    }
    load();
  }, [accountID, accountsStore, transactionsStore, router]);

  const isValid = useMemo(() => {
    if (!account) return false;
    const nameValid = formValues.name.trim().length >= 3;
    const dateValid = createInput.trim().length === 10;
    return nameValid && dateValid && !!formValues.type && !!formValues.color;
  }, [account, formValues, createInput]);

  const updateAccountState = useCallback((updated: Partial<AccountType>) => {
    setAccount((prev) => {
      if (!prev) return prev;
      const newAccount = { ...prev, ...updated };
      sessionStorage.setItem(CREATE_ACCOUNT_KEY, JSON.stringify(newAccount));
      return newAccount;
    });
  }, []);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateAccountState({ name: e.target.value });
    setFormValues((prev) => ({ ...prev, name: e.target.value }));
  };

  const handleInitialBalanceChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const raw = toEnglishDigits(e.target.value).replace(/\D/g, "");
    setFormValues((prev) => ({
      ...prev,
      initialBalance: Number(raw || 0),
    }));
  };

  const handleCreateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatJalaliInput(e.target.value, createInput);
    setCreateInput(formatted);
    const timestamp = parseJalaliInput(formatted);
    if (timestamp > 0) {
      setFormValues((prev) => ({ ...prev, createTimestamp: timestamp }));
    }
  };

  const handleColorChange = (color: AccountColorType) => {
    updateAccountState({ color });
    setFormValues((prev) => ({ ...prev, color }));
  };

  const handleSave = async () => {
    if (!isValid || !account) return;

    try {
      const transactions = (await getAll(
        transactionsStore,
      )) as TransactionType[];
      const existingInitialTx = transactions.find(
        (t) => t.type === "initial" && t.debit === account.id,
      );

      const finalTxId = existingInitialTx?.id ?? generateUUId();

      const res = await fetch("/api/accounts/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account,
          initialTransaction: {
            id: finalTxId,
            value: formValues.initialBalance,
            time: formValues.createTimestamp,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "خطا در ذخیره‌سازی");
      }

      const finalTx: TransactionType = existingInitialTx
        ? {
            ...existingInitialTx,
            value: formValues.initialBalance,
            time: formValues.createTimestamp,
          }
        : ({
            id: finalTxId,
            type: "initial",
            name: "موجودی اولیه",
            time: formValues.createTimestamp,
            value: formValues.initialBalance,
            debit: account.id,
            credit: "",
          } as TransactionType);

      const accountTxs = transactions
        .filter((t) => t.debit === account.id || t.credit === account.id)
        .map((t) => (t.id === finalTx.id ? finalTx : t));
      const updatedBalance = getAccountBalanceHistory(accountTxs, account.id);
      updateBalance(updatedBalance);

      sessionStorage.removeItem(CREATE_ACCOUNT_KEY);
      router.back();
    } catch (error) {
      console.error("Failed to save account:", error);
      alert("خطا در ذخیره‌سازی اطلاعات. لطفاً دوباره تلاش کنید.");
    }
  };

  const handleCancel = () => {
    sessionStorage.removeItem(CREATE_ACCOUNT_KEY);
  };

  usePageShowSync(() => {
    const data = sessionStorage.getItem(CREATE_ACCOUNT_KEY);
    if (!data) return;
    try {
      const parsed = JSON.parse(data) as AccountType;
      setAccount((prev) => {
        if (JSON.stringify(prev) !== JSON.stringify(parsed)) {
          return parsed;
        }
        return prev;
      });
      setFormValues((prev) => ({
        ...prev,
        name: parsed.name,
        type: parsed.type,
        color: parsed.color,
      }));
    } catch (e) {}
  }, []);

  return (
    <div className="p-7.5 grid gap-15">
      <div className="grid gap-7.5">
        <NavbarTitle title="ویرایش حساب" onClick={handleCancel}>
          {isLoading ? (
            <CapsuleLoading />
          ) : (
            <Capsule Icon={Left} primary={isValid} onClick={handleSave}>
              ذخیره تغییرات
            </Capsule>
          )}
        </NavbarTitle>
      </div>
      {isLoading ? (
        <div className="grid gap-10">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="grid gap-2">
              <div className="h-3 w-16 bg-elements-border rounded-md animate-pulse"></div>
              <div className="h-12 w-full bg-elements-background border border-elements-border rounded-2xl animate-pulse"></div>
            </div>
          ))}
        </div>
      ) : account ? (
        <div className="animate-fade-in">
          <AccountForm
            values={formValues}
            createInput={createInput}
            isValid={isValid}
            isDefault={account.default}
            isEditMode={true}
            onNameChange={handleNameChange}
            onInitialBalanceChange={handleInitialBalanceChange}
            onCreateChange={handleCreateChange}
            onColorChange={handleColorChange}
          />
        </div>
      ) : null}
    </div>
  );
}
