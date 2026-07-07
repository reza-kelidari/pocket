import { AccountType } from "@/utility/accounts/types";
import { AccountColors, PrimaryColors } from "@/utility/colors";
import Link from "next/link";
import { ComponentProps } from "react";
import { AccountBalanceType, BalanceType } from "@/utility/balance/types";
import { AccountTypes } from "@/utility/accounts/constants";

type AccountListElementPropsType = ComponentProps<"a"> & {
  account: AccountType;
  balances: AccountBalanceType[];
  disabled?: boolean;
};

export default function AccountsListElement({
  account,
  balances,
  disabled,
  ...props
}: AccountListElementPropsType) {
  const balance =
    balances.find((item) => item.id == account.id)?.history?.at(-1)?.balance ??
    0;

  const Icon = AccountTypes[account.type].icon;

  const activeColors = `${AccountColors[account.color].border} ${AccountColors[account.color].surface} ${AccountColors[account.color].text}`;
  const disableColors = `${PrimaryColors.disabled.box}`;

  return (
    <Link
      href={props.href ?? "#"}
      className={`flex items-center justify-between p-4 rounded-2xl border ${!disabled ? activeColors : disableColors}`}
      {...props}
    >
      <div className="grid gap-2.5">
        <h3 className="text-sm">{account.name}</h3>
        <span className="text-secondary text-xs">
          {balance.toLocaleString("fa-ir")} ﷼
        </span>
      </div>

      <div
        className={`${AccountColors[account.color].primary} rounded-4xl grid place-content-center h-7.5 w-7.5`}
      >
        <Icon height={20} width={20} fill="#fff" />
      </div>
    </Link>
  );
}
