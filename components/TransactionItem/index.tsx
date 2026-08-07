"use client";

import { AccountColors } from "@/utility/shared/colors";
import { TransactionType } from "@/utility/transactions/types";
import Wallet from "@/icons/Wallet";
import Link from "next/link";
import { AccountType } from "@/utility/accounts/types";
import { useEffect, useState } from "react";
import { getItem } from "@/utility/db/Database";
import { DatabaseStores } from "@/utility/keys/database";

type TransactionItemParamsType = {
  transaction: TransactionType;
  account: AccountType;
};

export default function TransactionItem({
  transaction,
  account,
}: TransactionItemParamsType) {
  const { id: txID, name, time, type, value, debit, credit } = transaction;
  const { accountsStore } = DatabaseStores;

  const [transferNames, setTransferNames] = useState<string[]>(["", ""]);

  const txName =
    type === "initial"
      ? "موجودی اولیه"
      : type === "transfer"
        ? transferNames[0] + " › " + transferNames[1]
        : name;

  const date = new Date(time);
  const isSameYear =
    new Date().toLocaleDateString("fa-ir", { year: "numeric" }) ===
    date.toLocaleDateString("fa-ir", { year: "numeric" });
  const dateOptions: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "long",
    year: !isSameYear ? "numeric" : undefined,
  };

  useEffect(() => {
    (async () => {
      if (type !== "transfer") return;

      const [creditAcc, debitAcc] = (await Promise.all([
        getItem(accountsStore, credit),
        getItem(accountsStore, debit),
      ])) as (AccountType | undefined)[];

      setTransferNames([creditAcc?.name ?? "", debitAcc?.name ?? ""]);
    })();
  }, [type, debit, credit]);

  return (
    <Link
      href={`/transactions/detail?id=${txID}`}
      className="w-full flex items-center gap-2.5"
    >
      <div
        className={`w-10 h-10 rounded-2xl grid place-content-center shrink-0 ${AccountColors[account.color ?? "black"].primary}`}
      >
        <Wallet fill="#fff" height={25} width={25} />
      </div>

      <div className="flex flex-col gap-2 w-full">
        <h1 className="text-xs">{txName}</h1>
        <p className="text-xs text-secondary">
          {date.toLocaleDateString("fa-ir", dateOptions)}
        </p>
      </div>

      <div
        className={`text-xs flex items-center gap-1 font-medium
          ${type === "debit" ? "text-income-primary" : type === "credit" ? "text-expense-primary" : ""}`}
      >
        {Number(value).toLocaleString("fa-ir")}
        <span
          className="grid place-content-center"
          style={{
            color:
              type === "initial" || type === "transfer"
                ? "transparent"
                : "inherit",
          }}
        >
          {type === "debit" ? "+" : "-"}
        </span>
      </div>
    </Link>
  );
}
