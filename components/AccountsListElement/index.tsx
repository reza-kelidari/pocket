import { AccountColorType } from "@/features/accounts/types";
import { AccountColors } from "@/features/colors";
import { IconComponent } from "@/icons/types";
import Link from "next/link";

type AccountListElementPropsType = {
  name: string;
  id: number;
  color: AccountColorType;
  Icon: IconComponent;
  balance: number;
};

export default function AccountsListElement({
  name,
  id,
  color,
  Icon,
  balance,
}: AccountListElementPropsType) {
  return (
    <Link href={`accounts/details?id=${id}`}
      className={`flex items-center justify-between p-5 rounded-2xl border
        ${AccountColors[color].border}
        ${AccountColors[color].surface}
        ${AccountColors[color].text}`}
    >
      <div className="grid gap-2">
        <h3 className="text-lg">{name}</h3>
        <span className="text-secondary text-xs">{balance.toLocaleString("fa-ir")} ﷼</span>
      </div>

      <div className={`${AccountColors[color].primary} rounded-4xl grid place-content-center h-7.5 w-7.5`}>
        <Icon height={17} width={17} fill="#fff" />
      </div>
    </Link>
  );
}
