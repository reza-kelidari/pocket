import { AccountColors } from "@/utility/shared/colors";
import { AccountColorType } from "@/utility/accounts/types";
import Link from "next/link";

type TagBalanceItemProps = {
  tagName: string;
  balance: number;
  accountColor: AccountColorType;
  accountId: string;
  tagId: string;
};

export default function TagBalanceItem({
  tagName,
  balance,
  accountColor,
  accountId,
  tagId,
}: TagBalanceItemProps) {
  const isPositive = balance >= 0;
  const isZero = balance === 0;
  const colorClasses = AccountColors[accountColor];
  const tagParam = tagId === "__untagged__" ? "untagged" : tagId;

  return (
    <Link
      href={`/accounts/${accountId}?tag=${tagParam}`}
      className={`w-full flex items-center justify-between p-4 rounded-2xl border ${colorClasses.border} ${colorClasses.surface}`}
    >
      <div className="flex items-center gap-2.5">
        <span className={`${colorClasses.primary} p-1 rounded-2xl`}></span>
        <span className="text-sm">{tagName}</span>
      </div>

      <div className="flex items-center gap-1">
        <span className="text-xs text-secondary">
          {Math.abs(balance).toLocaleString("fa-IR")} ﷼
        </span>
        <span
          className={`text-xs font-bold w-1 ${
            isPositive ? "text-income-primary" : "text-expense-primary"
          }`}
        >
          {isZero ? "" : isPositive ? "+" : "-"}
        </span>
      </div>
    </Link>
  );
}
