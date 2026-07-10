"use client";

import Button from "@/components/Button";
import Info from "@/icons/Info";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { balancesStore } from "@/utility/balance/service/balancesStore";
import { AccountType } from "@/utility/accounts/types";
import { TransactionType } from "@/utility/transactions/types";
import { clearStore, getAll } from "@/utility/db/Database";
import { DatabaseStores } from "@/utility/keys/database";
import { SplashShownKey } from "@/utility/keys/sessionStore";

export default function DeleteAllConfirm() {
  const [accounts, setAccounts] = useState<AccountType[]>([]);
  const [transactions, setTransactions] = useState<TransactionType[]>([]);
  const router = useRouter();
  const [validate, setValidate] = useState(false);
  const { accountsStore, transactionsStore, tagsStore } = DatabaseStores;

  useEffect(() => {
    (async () => {
      setAccounts((await getAll<AccountType>(accountsStore)));
      setTransactions((await getAll<TransactionType>(transactionsStore)));
    })();
  }, []);

  const handleDeleteAll = async () => {
    if (!validate) return;

    try {
      await clearStore(accountsStore);
      await clearStore(transactionsStore);
      await clearStore(tagsStore);
      balancesStore.clear();

      sessionStorage.removeItem(SplashShownKey);

      router.replace("/splash");
    } catch (error) {}
  };

  return (
    <div className="flex flex-col items-center justify-center gap-7.5 p-15 h-screen">
      <div className="flex items-center justify-center gap-2">
        <Info className="fill-red" height={30} width={30} />
        <h1 className="text-xl">هشدار</h1>
      </div>

      <p className="text-justify [text-align-last:center] text-xs w-6/7">
        با این‌کار تمام اطلاعات{" "}
        <span className="text-red">
          {accounts.length.toLocaleString("fa-IR")} حساب
        </span>{" "}
        شامل{" "}
        <span className="text-red">
          {transactions.length.toLocaleString("fa-IR")} تراکنش
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
      </div>

      <Button
        red={validate}
        secondary={!validate}
        disabled={!validate}
        onClick={handleDeleteAll}
      >
        حذف همه اطلاعات
      </Button>

      <Button secondary onClick={() => router.back()}>
        لغو
      </Button>
    </div>
  );
}
