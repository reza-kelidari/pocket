"use client";

import Box from "@/components/Box";
import { TransactionType } from "@/utility/shared/transactionTypes";
import { getCutoffTimestamp } from "@/utility/shared/timeMethods";
import { getTotalBalanceHistory } from "@/utility/shared/balancesMethods";
import { useMemo } from "react";
import WaterfallChart from "@/components/WaterfallChart";
import { calculateWaterfallData } from "@/utility/shared/waterfallMethods";

const ALL_TIME_PARAM = 36500;

type RowType =
  | {
      kind: "row";
      label: string;
      value: number;
      color: string;
      prefix?: string;
    }
  | { kind: "separator" };

export default function Profit({
  timeParam,
  transactions,
  isLoading,
}: {
  timeParam: number;
  transactions: TransactionType[];
  isLoading: boolean;
}) {
  const waterfallData = useMemo(
    () => calculateWaterfallData(transactions),
    [transactions],
  );

  // ─── محاسبه‌ی متریک‌های دوره (مثل قبل) ─────────────────
  const metrics = useMemo(() => {
    const cutoff =
      timeParam === ALL_TIME_PARAM ? 0 : getCutoffTimestamp(timeParam);
    let income = 0;
    let expense = 0;
    for (const tx of transactions) {
      if (tx.time < cutoff) continue;
      if (tx.type === "debit") income += tx.value;
      else if (tx.type === "credit") expense += tx.value;
    }
    const profit = income - expense;
    const totalHistory = getTotalBalanceHistory(transactions);
    let startBalance = 0;
    let endBalance = 0;
    if (totalHistory.length > 0) {
      if (cutoff === 0) {
        startBalance = 0;
      } else {
        for (let i = totalHistory.length - 1; i >= 0; i--) {
          if (totalHistory[i].time < cutoff) {
            startBalance = totalHistory[i].balance;
            break;
          }
        }
      }
      endBalance = totalHistory[totalHistory.length - 1].balance;
    }
    return {
      income,
      expense,
      profit,
      startBalance,
      endBalance,
      isAllTime: timeParam === ALL_TIME_PARAM,
    };
  }, [transactions, timeParam]);

  if (isLoading) {
    return (
      <div className="w-full flex flex-col gap-5">
        <Box className="flex flex-col gap-4 p-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="h-4 w-32 bg-elements-background rounded animate-pulse" />
              <div className="h-4 w-24 bg-elements-background rounded animate-pulse" />
            </div>
          ))}
        </Box>
      </div>
    );
  }

  const rows: RowType[] = [
    {
      kind: "row",
      label: "موجودی در ابتدای دوره",
      value: metrics.startBalance,
      color: "text-black",
    },
    { kind: "separator" },
    {
      kind: "row",
      label: "درآمد‌ها",
      value: metrics.income,
      color: "text-income-primary",
    },
    {
      kind: "row",
      label: "هزینه‌ها",
      value: metrics.expense,
      color: "text-expense-primary",
    },
    { kind: "separator" },
    {
      kind: "row",
      label: metrics.profit >= 0 ? "سود دوره" : "زیان دوره",
      value: Math.abs(metrics.profit),
      color:
        metrics.profit >= 0 ? "text-income-primary" : "text-expense-primary",
      prefix: metrics.profit >= 0 ? "+" : "-",
    },
    {
      kind: "row",
      label: "موجودی در پایان دوره",
      value: metrics.endBalance,
      color: "text-black",
    },
  ];

  return (
    <div className="w-full flex flex-col gap-5">
      <Box className="gap-3">
        <h3 className="text-xs text-secondary">
          روند سود و زیان ماهانه - {new Date().toLocaleString("fa-ir", {year: "numeric"})}
        </h3>
        <WaterfallChart data={waterfallData} />
      </Box>

      <Box className="gap-4">
        {rows.map((row, i) => {
          if (row.kind === "separator") {
            return <div key={`sep-${i}`} className="h-px bg-elements-border" />;
          }
          return (
            <div key={i} className="flex items-center justify-between">
              <span className="text-xs text-secondary">{row.label}</span>
              <span className={row.color}>
                <span className="text-sm font-bold">
                  {row.value.toLocaleString("fa-IR")}
                  {row.prefix || ""}{" "}
                </span>
                <span className="text-xs font-normal">﷼</span>
              </span>
            </div>
          );
        })}
      </Box>
    </div>
  );
}
