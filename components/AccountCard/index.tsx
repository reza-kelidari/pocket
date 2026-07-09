import { AccountTypes } from "@/utility/shared/accountsTypes";
import { AccountType } from "@/utility/accounts/types";
import { AccountColors } from "@/utility/colors";
import { IconComponent } from "@/icons/types";
import Link from "next/link";

/**
 * Displays an account as a clickable card.
 *
 * The card shows:
 * - Account icon based on its type.
 * - Current account balance.
 * - Account name.
 * - Color theme based on the selected account color.
 *
 * Clicking the card navigates to the account details page.
 *
 * @param props Account information.
 * @param props.id Unique account identifier. Used to generate the details page URL.
 * @param props.name Display name of the account.
 * @param props.color Theme color key used to style the card.
 * @param props.lastBalance Current account balance displayed on the card.
 * @param props.type Account type used to determine the displayed icon.
 *
 * @returns A clickable account card component.
 */

export default function AccountCard({
  id,
  name,
  color,
  lastBalance,
  type,
}: AccountType & { lastBalance: number }) {
  const cardColors = AccountColors[color];
  const CardIcon: IconComponent = AccountTypes[type].icon;

  return (
    <Link href={`/accounts/details?id=${id}`}>
      <div
        className={`w-58 h-36 border p-5 flex flex-col gap-2 rounded-4xl snap-center shrink-0
          ${AccountColors[color].surface}
          ${AccountColors[color].border}`}
        style={{ boxShadow: `0 10px 24px ${cardColors.shadow}` }}
      >
        <div
          className={`h-6.5 w-6.5 grid place-content-center rounded-4xl mr-auto p-0 m-0
            ${AccountColors[color].primary}`}
        >
          <CardIcon height={17} width={17} fill="#fff" />
        </div>
        <div
          className={`flex gap-1.5 mt-auto items-center
            ${AccountColors[color].text}`}
        >
          <h1 className="text-xl font-extrabold">
            {lastBalance.toLocaleString("fa-ir")}
          </h1>
          <span className="text-xs">﷼</span>
        </div>
        <h2 className="text-xs">{name}</h2>
      </div>
    </Link>
  );
}
