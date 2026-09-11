"use client";
import { useState, useEffect, useMemo } from "react";
import Button from "../Button";
import { BalanceType } from "@/utility/balance/types";
import { AccountColorType } from "@/utility/accounts/types";
import { AccountColors, PrimaryColors } from "@/utility/shared/colors";
import ChartBox from "./ChartBox";
import {
  getAccountBalanceHistory,
  getTotalBalanceHistory,
  sliceDailySeriesForWindow,
  getAllTimeSpanDays,
  ChartWindow,
} from "@/utility/shared/balancesMethods";
import { TransactionType } from "@/utility/shared/transactionTypes";
import Box from "../Box";
import { getAll } from "@/utility/db/Database";
import { DatabaseStores } from "@/utility/keys/database";

type ChartParamsType = {
  title: string;
  titlePrimary?: boolean;
  accountID?: string;
  timeSelector?: boolean;
  days?: number | "all";
  link?: string;
  linkTitle?: string;
  color?: AccountColorType;
  transactions?: TransactionType[];
};

const FILTERS: Array<{ label: string; value: ChartWindow }> = [
  { label: "۷", value: 7 },
  { label: "۳۰", value: 30 },
  { label: "۹۰", value: 90 },
  { label: "همه", value: "all" },
];

export default function ChartContainer({
  title,
  titlePrimary,
  accountID,
  timeSelector = false,
  days = 30,
  link,
  linkTitle,
  color,
  transactions,
}: ChartParamsType) {
  const isControlled = transactions !== undefined;

  const [isLoading, setIsLoading] = useState(!isControlled);
  const [internalTxs, setInternalTxs] = useState<TransactionType[]>([]);

  useEffect(() => {
    if (isControlled) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    async function loadData() {
      setIsLoading(true);
      try {
        const txs = await getAll<TransactionType>(
          DatabaseStores.transactionsStore,
        );
        if (isMounted) setInternalTxs(txs);
      } catch (err) {
        console.error("ChartContainer: failed to fetch transactions", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [isControlled]);

  const sourceTxs = isControlled ? transactions : internalTxs;

  const normalizedDays = (days === 36500 ? "all" : (days ?? 30)) as ChartWindow;
  const [activeFilter, setActiveFilter] = useState<ChartWindow>(normalizedDays);

  const currentWindow: ChartWindow = timeSelector
    ? activeFilter
    : normalizedDays;

  const fullHistory: BalanceType[] = useMemo(() => {
    return accountID
      ? (getAccountBalanceHistory(sourceTxs, accountID).history ?? [])
      : getTotalBalanceHistory(sourceTxs);
  }, [sourceTxs, accountID]);

  const chartBalance: number = fullHistory.at(-1)?.balance ?? 0;

  const chartHistory: BalanceType[] = useMemo(() => {
    return sliceDailySeriesForWindow(fullHistory, currentWindow, Date.now());
  }, [fullHistory, currentWindow]);

  const windowLabel = useMemo(() => {
    if (currentWindow === "all") {
      const exactDays = getAllTimeSpanDays(fullHistory, Date.now());
      return exactDays > 0
        ? `(${exactDays.toLocaleString("fa-ir")} روز گذشته)`
        : "(از ابتدا)";
    }
    return `(${currentWindow.toLocaleString("fa-ir")} روز گذشته)`;
  }, [currentWindow, fullHistory]);

  if (isLoading) {
    return (
      <Box className="overflow-hidden animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 w-24 bg-elements-background rounded animate-pulse" />
        </div>
        <div className="h-40 w-full bg-elements-background border border-elements-border rounded-2xl animate-pulse" />
      </Box>
    );
  }

  return (
    <Box className="overflow-hidden animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3
          className={`${titlePrimary ? "forground" : "text-secondary"} text-xs`}
        >
          {title} {timeSelector && windowLabel}
        </h3>
        {timeSelector && (
          <div
            className={`flex gap-2 items-center justify-between h-7 rounded-4xl ${color ? AccountColors[color].surface : PrimaryColors.primary.bg}`}
          >
            {FILTERS.map((item) => (
              <span
                key={item.label}
                className={`text-xs h-full min-w-7 px-1.5 grid place-items-center rounded-4xl cursor-pointer transition-colors ${
                  item.value === activeFilter
                    ? `${color ? AccountColors[color].primary : "bg-primary"} text-white`
                    : "text-secondary hover:bg-black/5"
                }`}
                onClick={() => setActiveFilter(item.value)}
              >
                {item.label}
              </span>
            ))}
          </div>
        )}
      </div>
      <ChartBox data={chartHistory} color={color} minPointDistance={20} />
      <div className="flex gap-1.5 mr-auto items-center mt-4">
        <h1 className="font-bold">{chartBalance.toLocaleString("fa-ir")}</h1>
        <span className="text-xs">﷼</span>
      </div>
      {link && <Button href={link}>{linkTitle || ""}</Button>}
    </Box>
  );
}
