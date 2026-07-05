import { accountsStore } from "@/features/accounts/service/accountsStore";
import { AccountColors } from "@/features/colors";
import Wallet from "@/icons/Wallet";

type TransactionItemParamsType = {
  name: string;
  account: number;
  category?: number;
  time: number;
  value: number;
  type: "debit" | "credit" | "transfer" | "initial";
};

export default function TransactionItem({
  name,
  account,
  category,
  time,
  value,
  type,
}: TransactionItemParamsType) {
  const accountData = accountsStore
    .getAccounts()
    .find((item) => item.id === account);

  return (
    <div className="w-full flex items-cente gap-2.5">
      <div
        className={`w-10 h-10 rounded-2xl grid place-content-center shrink-0 ${AccountColors[accountData?.color ?? "black"].primary}`}
      >
        <Wallet fill="#fff" height={25} width={25} />
      </div>

      <div className="flex flex-col gap-1.5 w-full">
        <h1 className="text-xs font-medium">{name}</h1>
        <p className="text-xs text-secondary">
          {new Date(time).toLocaleDateString("fa-ir")}
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
    </div>
  );
}
