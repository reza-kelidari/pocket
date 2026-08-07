"use client";

import Button from "@/components/Button";
import Info from "@/icons/Info";
import { AccountColors } from "@/utility/shared/colors";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { deleteItem, getAll, getItem } from "@/utility/db/Database";
import { AccountType } from "@/utility/accounts/types";
import { TransactionType } from "@/utility/transactions/types";
import { DatabaseStores } from "@/utility/keys/database";
import useBalances from "@/utility/balance/service/useBalances";
import ProcessingOverlay from "@/components/ProcessingOverlay";

export default function AccountDelete() {
  const searchParams = useSearchParams();
  const accountID = searchParams.get("id") ?? "";
  const router = useRouter();
  const { removeBalance } = useBalances();
  const { accountsStore, transactionsStore } = DatabaseStores;

  const [account, setAccount] = useState<AccountType>();
  const [transactionsCount, setTransactionsCount] = useState("۰");
  const [validate, setValidate] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    (async () => {
      setAccount(
        (await getItem<AccountType>(accountsStore, accountID)) ?? undefined,
      );
      const txs = await getAll<TransactionType>(transactionsStore);
      setTransactionsCount(
        txs
          .filter(
            (item) => item.credit === accountID || item.debit === accountID,
          )
          .length.toLocaleString("fa-IR"),
      );
    })();
  }, [accountID, accountsStore, transactionsStore, router]);

  const handleDelete = async () => {
    if (!validate) return;
    setIsProcessing(true);

    try {
      await deleteItem(accountsStore, accountID);
      removeBalance(accountID);
      router.back();
    } catch (error) {
      setIsProcessing(false);
      console.error(error);
    }
  };

  if (isProcessing) {
    return (
      <ProcessingOverlay title="در حال حذف حساب" subtitle="لطفاً صبر کنید..." />
    );
  }

  if (!account) return null;

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
            checked={validate}
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
          onClick={handleDelete}
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
