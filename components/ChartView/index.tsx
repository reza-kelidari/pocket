import { useState } from "react";
import Button from "../Button";
import { BalanceType } from "@/features/balance/types";
import { AccountColorType } from "@/features/accounts/types";
import { AccountColors, PrimaryColors } from "@/features/colors";
import ChartBox from "./ChartBox";

type ChartParamsType = {
  title: string;
  titlePrimary?: boolean;
  data: BalanceType[];
  timeSelector?: boolean;
  link?: string;
  linkTitle?: string;
  balance: number;
  color?: AccountColorType;
};

export default function Chart({
  title,
  titlePrimary,
  data,
  timeSelector,
  link,
  linkTitle,
  balance,
  color,
}: ChartParamsType) {
  const filters = [7, 30, 90];

  const [activeFilter, setActiveFilter] = useState(filters[1]);

  return (
    <div className="w-full bg-elements-background border border-elements-border rounded-4xl p-5 flex flex-col gap-2.5 shadow-xl shadow-zinc-100">
      <div className="flex items-center justify-between">
        <h3
          className={`${titlePrimary ? "forground" : "text-secondary"} text-xs`}
        >
          {title} {timeSelector && `(${activeFilter.toLocaleString("fa-ir")} روز گذشته)`}
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

      <ChartBox data={data} daysFilter={activeFilter} color={color} lastBalance={balance} />

      <div className="flex gap-1.5 mr-auto items-center">
        <h1 className="font-bold">{balance.toLocaleString("fa-ir")}</h1>
        <span className="text-xs">﷼</span>
      </div>
      {link ? <Button link={link}>{linkTitle || ""}</Button> : ""}
    </div>
  );
}
