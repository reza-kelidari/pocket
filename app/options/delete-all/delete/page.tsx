"use client";

import Button from "@/components/Button";
import Info from "@/icons/Info";
import { useAccounts } from "@/utility/accounts/service/useAccounts";
import useTransactions from "@/utility/transactions/service/useTransactions";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { accountsStore } from "@/utility/accounts/service/accountsStore";
import { transactionsStore } from "@/utility/transactions/service/transactionsStore";
import { balancesStore } from "@/utility/balance/service/balancesStore";

export default function DeleteAllConfirm() {
  const { getAccounts } = useAccounts();
  const { getTransactions } = useTransactions();
  const router = useRouter();
  const [validate, setValidate] = useState(false);

  useEffect(() => {
    if (getAccounts().length === 0) {
      const currentPath = window.location.pathname + window.location.search;
      router.replace(`/splash?from=${encodeURIComponent(currentPath)}`);
    }
  }, [getAccounts, router]);

  const handleDeleteAll = async () => {
    if (!validate) return;

    try {
      await accountsStore.clear();
      await transactionsStore.clear();
      balancesStore.clear();

      sessionStorage.removeItem("splashShown");

      router.replace("/splash");
    } catch (error) {
      console.error("Error deleting all data:", error);
    }
  };

  if (getAccounts().length === 0) return null;

  return (
    <div className="grid place-content-center gap-7.5 p-15 h-screen">
      <div className="flex items-center justify-center gap-2">
        <Info className="fill-red" height={30} width={30} />
        <h1 className="text-xl">هشدار</h1>
      </div>

      <p className="text-justify [text-align-last:center] text-xs">
        با این‌کار تمام اطلاعات{" "}
        <span className="text-red">
          {getAccounts().length.toLocaleString("fa-IR")} حساب
        </span>{" "}
        شامل{" "}
        <span className="text-red">
          {getTransactions().length.toLocaleString("fa-IR")} تراکنش
        </span>{" "}
        حذف میشه؛ مطمئن هستین؟
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
          className="transition-all"
          onClick={handleDeleteAll}
        >
          حذف همه اطلاعات
        </Button>
      </div>

      <Button secondary onClick={() => router.back()}>
        لغو
      </Button>
    </div>
  );
}
