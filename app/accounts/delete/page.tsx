"use client";

import Button from "@/components/Button";
import Info from "@/icons/Info";
import { useAccounts } from "@/utility/accounts/service/useAccounts";
import { AccountColors } from "@/utility/colors";
import useTransactions from "@/utility/transactions/service/useTransactions";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function AccountDelete() {
  const searchParams = useSearchParams();
  const accountID = Number(searchParams.get("id") ?? "0");
  const { getAccounts, removeAccount } = useAccounts();
  const { getTransactions } = useTransactions();
  const { removeTransactionsByAccountID } = useTransactions();
  const router = useRouter();
  const [validate, setValidate] = useState(false);
  const account = getAccounts().find((acc) => acc.id === accountID);
  const transactionsCount = getTransactions()
    .filter((item) => item.credit === accountID || item.debit === accountID)
    .length.toLocaleString("fa-ir");

  useEffect(() => {
    if (getAccounts().length === 0) {
      const currentPath = window.location.pathname + window.location.search;
      router.replace(`/splash?from=${encodeURIComponent(currentPath)}`);
    } else if (!account) {
      router.replace(`/accounts`);
    }
  }, [getAccounts, router, account]);

  if (getAccounts().length === 0 || !account) return null;

  const handleDelete = () => {
    if (!validate) return;

    removeAccount(accountID);

    removeTransactionsByAccountID(accountID);

    router.back();
  };

  return (
    <div className="grid place-content-center gap-7.5 p-15 h-screen">
      <div className="flex items-center justify-center gap-2">
        <Info className="fill-red" height={30} width={30} />
        <h1 className="text-xl">هشدار</h1>
      </div>

      <p className="text-justify [text-align-last:center] text-xs">
        با این‌کار تمام تراکنش‌های حساب{" "}
        <span className="font-bold">
          {account.name}{" "}
          <span
            className={`inline-block h-2 w-2 rounded-4xl ${AccountColors[account.color].primary}`}
          ></span>
        </span>{" "}
        شامل {transactionsCount} تراکنش <span className="text-red">حذف</span>{" "}
        میشه؛ مطمئن هستین؟
      </p>

      <div className="grid gap-4">
        <label className="flex items-center justify-center gap-2 cursor-pointer text-xs">
          <input
            type="checkbox"
            onChange={(e) => setValidate(e.target.checked)}
            className="accent-red p-3 ml-1"
          />
          بله، مطمئن هستم
        </label>

        <Button
          red={validate}
          secondary={!validate}
          disabled={!validate}
          onClick={handleDelete}
          className="transition-all"
        >
          حذف حساب
        </Button>
      </div>

      <Button secondary onClick={() => router.back()}>
        لغو
      </Button>
    </div>
  );
}
