import { useState } from "react";
import Button from "../Button";
import { AccountBalanceType } from "@/features/balance/types";
import { AccountColorType } from "@/features/accounts/types";

type ChartParamsType = {
  title: string;
  titlePrimary?: boolean;
  data: AccountBalanceType;
  timeSelector?: boolean;
  link?: string;
  linkTitle?: string;
  balance: number;
  color?: AccountColorType
};

export default function Chart({
  title,
  titlePrimary,
  data,
  timeSelector,
  link,
  linkTitle,
  balance: value,
}: ChartParamsType) {
  const filters = [
    { id: 0, name: "۷", range: 0 },
    { id: 1, name: "۳۰", range: 0 },
    { id: 2, name: "۹۰", range: 0 },
  ];

  const [activeFilter, setActiveFilter] = useState(1);

  return (
    <div className="w-full min-h-50 bg-elements-background border border-elements-border rounded-4xl p-5 flex flex-col gap-2.5 shadow-xl shadow-zinc-100">
      <div className="flex items-center justify-between">
        <h3
          className={`${titlePrimary ? "forground" : "text-secondary"} text-xs`}
        >
          {title} {timeSelector && `(${filters[activeFilter].name} روز گذشته)`}
        </h3>
        {timeSelector ? (
          <div className="flex gap-2 items-center justify-between h-7 bg-primary-background rounded-4xl">
            {filters.map((item) => (
              <span
                key={item.id}
                className={`text-xs h-full w-7 grid place-items-center rounded-4xl ${item.id === activeFilter && "bg-primary text-white"}`}
                onClick={() => setActiveFilter(item.id)}
              >
                {item.name}
              </span>
            ))}
          </div>
        ) : (
          ""
        )}
      </div>

      <div className="w-full h-30 bg-primary-background rounded-xl"></div>

      <div className="flex gap-1.5 mr-auto items-center">
        <h1 className="font-bold">{value.toLocaleString("fa-ir")}</h1>
        <span className="text-xs">﷼</span>
      </div>
      {link ? <Button link={link}>{linkTitle || ""}</Button> : ""}
    </div>
  );
}
