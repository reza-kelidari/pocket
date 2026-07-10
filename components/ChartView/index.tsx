import { useState } from "react";
import Button from "../Button";
import { AccountBalanceType, BalanceType } from "@/utility/balance/types";
import { AccountColorType } from "@/utility/accounts/types";
import { AccountColors, PrimaryColors } from "@/utility/colors";
import ChartBox from "./ChartBox";
import {
  getAccountBalanceHistory,
  getTotalBalanceHistory,
} from "@/utility/shared/balancesMethods";
import { TransactionType } from "@/utility/transactions/types";
import Box from "../Box";

type ChartParamsType = {
  title: string;
  titlePrimary?: boolean;
  accountID?: number;
  timeSelector?: boolean;
  link?: string;
  linkTitle?: string;
  color?: AccountColorType;
  transactions: TransactionType[];
};

export default function Chart({
  title,
  titlePrimary,
  accountID,
  timeSelector,
  link,
  linkTitle,
  color,
  transactions,
}: ChartParamsType) {
  const totalHistory = getTotalBalanceHistory(transactions);
  const totalBalance = totalHistory.at(-1)?.balance ?? 0;

  let chartHistory: BalanceType[] = accountID
    ? (getAccountBalanceHistory(transactions, accountID).history ?? [])
    : totalHistory;
  let chartBalance: number = accountID
    ? (chartHistory.at(-1)?.balance ?? 0)
    : totalBalance;

  const filters = [7, 30, 90];
  const [activeFilter, setActiveFilter] = useState(filters[1]);

  return (
    <Box className="overflow-hidden">
      <div className="flex items-center justify-between">
        <h3
          className={`${titlePrimary ? "forground" : "text-secondary"} text-xs`}
        >
          {title}{" "}
          {timeSelector &&
            `(${activeFilter.toLocaleString("fa-ir")} روز گذشته)`}
        </h3>
        {timeSelector ? (
          <div
            className={`flex gap-2 items-center justify-between h-7 rounded-4xl ${color ? AccountColors[color].surface : PrimaryColors.primary.bg}`}
          >
            {filters.map((item) => (
              <span
                key={item}
                className={`text-xs h-full w-7 grid place-items-center rounded-4xl ${item === activeFilter && `${color ? AccountColors[color].primary : "bg-primary"} text-white`}`}
                onClick={() => setActiveFilter(item)}
              >
                {item.toLocaleString("fa-ir")}
              </span>
            ))}
          </div>
        ) : (
          ""
        )}
      </div>

      <ChartBox
        data={chartHistory}
        daysFilter={activeFilter}
        color={color}
        lastBalance={chartBalance}
        minPointDistance={20}
      />

      <div className="flex gap-1.5 mr-auto items-center">
        <h1 className="font-bold">{chartBalance.toLocaleString("fa-ir")}</h1>
        <span className="text-xs">﷼</span>
      </div>
      {link ? <Button href={link}>{linkTitle || ""}</Button> : ""}
    </Box>
  );
}
