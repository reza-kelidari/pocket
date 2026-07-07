"use client";

import Button from "@/components/Button";
import { useAccounts } from "@/utility/accounts/service/useAccounts";
import { AccountColors } from "@/utility/colors";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function AccountDelete() {
  const searchParams = useSearchParams();
  const accountID = Number(searchParams.get("id") ?? "0");
  const { getAccounts, removeAccount } = useAccounts();
  const router = useRouter();
  const [validate, setValidate] = useState(false);
  const account = getAccounts().find((acc) => acc.id === accountID);

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
    router.back();
  };

  return (
    <div className="grid place-content-center gap-7.5 p-15 h-screen">
      <h1 className="text-center text-xl">هشدار</h1>
      <p className="text-center text-xs">
        با این‌کار تمام تراکنش‌های حساب{" "}
        <span className="font-bold">
          {account.name} <span className={`inline-block h-2 w-2 rounded-4xl ${AccountColors[account.color].primary}`}></span>
        </span>{" "}
        اعم‌از واریز، برداشت، انتقال حذف میشه؛ مطمئن هستین؟
      </p>

      <div className="grid gap-4">
        <label className="flex items-center justify-center gap-2 cursor-pointer text-xs">
          <input
            type="checkbox"
            onChange={(e) => setValidate(e.target.checked)}
            className="accent-red p-8"
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
