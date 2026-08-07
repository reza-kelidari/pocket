"use client";

import Capsule from "@/components/Capsule";
import NavbarTitle from "@/components/NavbarTitle";
import Left from "@/icons/Left";
import { AccountTypes } from "@/utility/shared/accountsTypes";
import { AccountColorType, AccountType } from "@/utility/accounts/types";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AccountColors } from "@/utility/shared/colors";
import { CREATE_ACCOUNT_KEY } from "../add/page";
import { TransactionType } from "@/utility/transactions/types";
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

const defaultAccount: AccountType = {
  id: crypto.randomUUID(),
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
  const [createTimestamp, setCreateTimestamp] = useState(0);
  const [initialBalance, setInitialBalance] = useState(0);

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

      if (initialTx) {
        const txTime = Number(initialTx.time) || 0;
        setCreateTimestamp(txTime);
        setCreateInput(formatJalaliDate(txTime));
        setInitialBalance(Number(initialTx.value) || 0);
      } else {
        setCreateTimestamp(Date.now());
        setCreateInput(formatJalaliDate(Date.now()));
        setInitialBalance(0);
      }

      setIsLoading(false);
    }
    load();
  }, [accountID, accountsStore, transactionsStore, router]);

  const isValid = useMemo(() => {
    if (!account) return false;
    const nameValid = account.name.trim().length >= 3;
    const dateValid = createInput.trim().length === 10;
    return nameValid && dateValid && !!account.type && !!account.color;
  }, [account, createInput]);

  const updateAccountState = useCallback((updated: Partial<AccountType>) => {
    setAccount((prev) => {
      if (!prev) return prev;
      const newAccount = { ...prev, ...updated };
      sessionStorage.setItem(CREATE_ACCOUNT_KEY, JSON.stringify(newAccount));
      return newAccount;
    });
  }, []);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    updateAccountState({ name: e.target.value });

  function handleInitialChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = toEnglishDigits(e.target.value).replace(/\D/g, "");
    setInitialBalance(Number(raw || 0));
  }

  const handleCreateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatJalaliInput(e.target.value, createInput);
    setCreateInput(formatted);
    const timestamp = parseJalaliInput(formatted);
    if (timestamp > 0) setCreateTimestamp(timestamp);
  };

  const handleColorChange = (color: AccountColorType) =>
    updateAccountState({ color });

  const handleSave = async () => {
    if (!isValid || !account) return;

    await putItem(accountsStore, account);

    const transactions = (await getAll(transactionsStore)) as TransactionType[];
    const initialTx = transactions.find(
      (t) => t.type === "initial" && t.debit === account.id,
    );

    let finalTx: TransactionType;
    if (initialTx) {
      finalTx = {
        ...initialTx,
        value: initialBalance,
        time: createTimestamp,
      };
    } else {
      finalTx = {
        id: crypto.randomUUID(),
        type: "initial",
        name: "موجودی اولیه",
        time: createTimestamp,
        value: initialBalance,
        debit: account.id,
        credit: "",
      } as TransactionType;
    }
    await putItem(transactionsStore, finalTx);

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
    } catch (e) {}
  }, []);

  if (isLoading || !account)
    return (
      <div className="p-7.5 grid gap-15">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <div className="h-5 w-5 bg-elements-border rounded-md animate-pulse"></div>
            <div className="h-6 w-24 bg-elements-border rounded-md animate-pulse"></div>
          </div>
          <div className="h-8 w-28 bg-elements-border rounded-4xl animate-pulse"></div>
        </div>
        <div className="grid gap-10">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="grid gap-2">
              <div className="h-3 w-16 bg-elements-border rounded-md animate-pulse"></div>
              <div className="h-12 w-full bg-elements-background border border-elements-border rounded-2xl animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    );
  else
    return (
      <div className="p-7.5 grid gap-15 animate-fade-in">
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

          {!account.default && (
            <div className="grid gap-2">
              <span className="text-xs">رنگ حساب</span>
              <div className="grid grid-cols-4 gap-7.5 w-full p-5">
                {Object.entries(AccountColors).map(([key, color]) => (
                  <button
                    type="button"
                    key={key}
                    onClick={() => handleColorChange(key as AccountColorType)}
                    aria-label={`انتخاب رنگ ${key}`}
                    className={`${color.primary} h-11 w-11 rounded-3xl cursor-pointer transition-all duration-200 justify-self-center border-4 border-transparent ${account.color === key ? "scale-90 border-white/50 shadow-2xl" : ""}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
}
