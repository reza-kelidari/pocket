"use client";

import Button from "@/components/Button";
import Info from "@/icons/Info";
import { AccountColors } from "@/utility/colors";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { deleteItem, getAll, getItem } from "@/utility/db/Database";
import { AccountType } from "@/utility/accounts/types";
import { TransactionType } from "@/utility/transactions/types";
import { DatabaseStores } from "@/utility/keys/database";
import useBalances from "@/utility/balance/service/useBalances";

export default function AccountDelete() {
  const searchParams = useSearchParams();
  const accountID = Number(searchParams.get("id") ?? "0");
  const router = useRouter();
  const { removeBalance } = useBalances();
  const { accountsStore, transactionsStore } = DatabaseStores;

  const [account, setAccount] = useState<AccountType>();
  const [transactionsCount, setTransactionsCount] = useState("۰");

  const [validate, setValidate] = useState(false);

  useEffect(() => {
    (async () => {
      setAccount(
        (await getItem<AccountType>(accountsStore, accountID)) ?? undefined,
      );

      setTransactionsCount(
        (await getAll<TransactionType>(transactionsStore))
          .filter(
            (item) => item.credit === accountID || item.debit === accountID,
          )
          .length.toLocaleString("fa-IR"),
      );
    })();
  }, [accountID, accountsStore, transactionsStore, router]);

  const handleDelete = async () => {
    if (!validate) return;

    const transactions = (await getAll(transactionsStore)) as TransactionType[];
    const toDelete = transactions.filter(
      (t) => t.debit === accountID || t.credit === accountID,
    );
    for (const tx of toDelete) {
      await deleteItem(transactionsStore, tx.id);
    }

    await deleteItem(accountsStore, accountID);

    removeBalance(accountID);

    router.back();
  };

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
