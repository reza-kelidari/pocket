import { accountsStore } from "@/utility/accounts/service/accountsStore";
import { AccountColors } from "@/utility/colors";
import { TransactionType } from "@/utility/transactions/types";
import Wallet from "@/icons/Wallet";
import Link from "next/link";

type TransactionItemParamsType = {
  transaction: TransactionType;
};

export default function TransactionItem({
  transaction,
}: TransactionItemParamsType) {
  const { id: txID, name, time, debit, credit, type, value } = transaction;

  const accountID = type === "credit" ? credit : debit;
  const txName = type === "initial" ? "موجودی اولیه" : name;

  const date = new Date(time);
  const isSameYear =
    new Date().toLocaleDateString("fa-ir", { year: "numeric" }) ===
    date.toLocaleDateString("fa-ir", { year: "numeric" });
  const dateOptions: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "long",
    year: !isSameYear ? "numeric" : undefined,
  };

  const accountData = accountsStore
    .getAccounts()
    .find((item) => item.id === accountID);

  return (
    <Link
      href={`/transactions/detail?id=${txID}`}
      className="w-full flex items-cente gap-2.5"
    >
      <div
        className={`w-10 h-10 rounded-2xl grid place-content-center shrink-0 ${AccountColors[accountData?.color ?? "black"].primary}`}
      >
        <Wallet fill="#fff" height={25} width={25} />
      </div>

      <div className="flex flex-col gap-1.5 w-full">
        <h1 className="text-xs font-medium">{txName}</h1>
        <p className="text-xs text-secondary">
          {date.toLocaleDateString("fa-ir", dateOptions)}
        </p>
      </div>

      <div
        className={`text-xs flex items-center gap-1 font-bold
          ${type === "debit" ? "text-income-primary" : type === "credit" ? "text-expense-primary" : ""}`}
      >
        {value.toLocaleString("fa-ir")}
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
