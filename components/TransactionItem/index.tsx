"use client";

import { AccountColors } from "@/utility/shared/colors";
import { TransactionType } from "@/utility/shared/transactionTypes";
import Wallet from "@/icons/Wallet";
import Link from "next/link";
import { AccountType } from "@/utility/accounts/types";

type TransactionItemParamsType = {
  transaction: TransactionType;
  account: AccountType;
  accounts: AccountType[];
  /** Balance immediately after this transaction. Shown below the amount. */
  balanceAfter?: number;
};

export default function TransactionItem({
  transaction,
  account,
  accounts,
  balanceAfter,
}: TransactionItemParamsType) {
  const { id: txID, name, time, type, value, debit, credit } = transaction;

  const creditAcc = accounts.find((acc) => acc.id === credit);
  const debitAcc = accounts.find((acc) => acc.id === debit);

  const txName =
    type === "initial"
      ? "موجودی اولیه"
      : type === "transfer"
        ? `${creditAcc?.name ?? ""} › ${debitAcc?.name ?? ""}`
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

  return (
    <Link
      href={`/transactions/detail?id=${txID}`}
      className="w-full flex items-center gap-2.5"
    >
      <div
        className={`w-10 h-10 rounded-2xl grid place-content-center shrink-0 ${AccountColors[account?.color].primary}`}
      >
        <Wallet fill="#fff" height={25} width={25} />
      </div>
      <div className="flex flex-col gap-2 w-full">
        <h1 className="text-xs">{txName}</h1>
        <p className="text-xs text-secondary">
          {date.toLocaleDateString("fa-ir", dateOptions)}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1 px-1">
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
        {balanceAfter !== undefined && type !== "initial" && (
          <span className="text-[9px] text-secondary leading-none whitespace-nowrap">
            {balanceAfter.toLocaleString("fa-ir")} ﷼
          </span>
        )}
      </div>
    </Link>
  );
}
