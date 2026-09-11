"use client";

import Box from "@/components/Box";
import WaterfallChart from "@/components/WaterfallChart";
import type { ProfitMetrics, WaterfallDataShape } from "../../page";

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
  data,
  waterfall,
  isLoading,
}: {
  data: ProfitMetrics | undefined;
  waterfall: WaterfallDataShape | undefined;
  isLoading: boolean;
}) {
  if (isLoading || !data || !waterfall) {
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
      value: data.startBalance,
      color: "text-black",
    },
    { kind: "separator" },
    {
      kind: "row",
      label: "درآمد‌ها",
      value: data.income,
      color: "text-income-primary",
    },
    {
      kind: "row",
      label: "هزینه‌ها",
      value: data.expense,
      color: "text-expense-primary",
    },
    { kind: "separator" },
    {
      kind: "row",
      label: data.profit >= 0 ? "سود دوره" : "زیان دوره",
      value: Math.abs(data.profit),
      color: data.profit >= 0 ? "text-income-primary" : "text-expense-primary",
      prefix: data.profit >= 0 ? "+" : "-",
    },
    {
      kind: "row",
      label: "موجودی در پایان دوره",
      value: data.endBalance,
      color: "text-black",
    },
  ];

  return (
    <div className="w-full flex flex-col gap-5">
      <Box className="gap-3">
        <h3 className="text-xs text-secondary">
          روند سود و زیان ماهانه -{" "}
          {new Date().toLocaleString("fa-ir", { year: "numeric" })}
        </h3>
        <WaterfallChart data={waterfall as any} />
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
