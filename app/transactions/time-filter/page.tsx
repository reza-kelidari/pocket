"use client";

import NavbarTitle from "@/components/NavbarTitle";
import { useRedirect } from "@/utility/redirect/service/useRedirect";
import { persianDateToEnglishNumber } from "@/utility/time/methods";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { filterToUrl, timeFilters } from "../methods";

export default function TimeFilter() {
  const searchParams = useSearchParams();
  const { add, back } = useRedirect();

  const parseNumberArray = (param: string | null): number[] => {
    if (!param) return [];
    return param
      .split(",")
      .map(Number)
      .filter((n) => !isNaN(n) && n !== 0); // فقط اعداد معتبر
  };

  let transactionsFilter = {
    timeWindow: Number(searchParams.get("time") ?? 30),
    accounts: parseNumberArray(searchParams.get("accounts")),
    categories: parseNumberArray(searchParams.get("categories")),
    tags: parseNumberArray(searchParams.get("tags")),
  };

  useEffect(() => {
    add(window.location.pathname);
  }, [add]);

  console.log(transactionsFilter);
  return (
    <div className="p-7.5 grid gap-15 w-screen overflow-hidden">
      <div className="grid gap-7.5">
        <NavbarTitle title="بازه زمانی" />
      </div>

      <div className="grid gap-4">
        {timeFilters(persianDateToEnglishNumber(new Date())).map(
          (item, index) => (
            <Link
              key={index}
              href={`/transactions${filterToUrl({
                ...transactionsFilter,
                timeWindow: item.time,
              })}`}
              onClick={back}
            >
              {item.name}
            </Link>
          ),
        )}
      </div>
    </div>
  );
}
