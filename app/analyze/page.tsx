"use client";

import NavbarTitle from "@/components/NavbarTitle";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DEFAULT_TIME_WINDOW } from "@/app/transactions/methods";
import Left from "@/icons/Left";
import CashFlow from "./components/CashFlow";
import Profit from "./components/Profit";
import { PrimaryColors } from "@/utility/shared/colors";
import TimeWindow from "@/components/TimeWindow";
import { useTimeWindow } from "@/utility/shared/useTimeWindow";
import FinancialAnalysis from "./components/FinancialAnalysis";
import { useTimeFilterOptions } from "@/utility/shared/useTimeFilterOptions";

/* ─── Shapes matching the /api/analyze response ─────────────── */

export type ChartSlice = {
  id: number | "other";
  name: string;
  amount: number;
  percent: number;
};

export type TagBreakdown = { tagId: string; tagName: string; amount: number };

export type CategoryBreakdown = {
  id: number;
  name: string;
  amount: number;
  tags: TagBreakdown[];
  untaggedAmount: number;
};

export type GroupBreakdown = {
  id: number;
  name: string;
  amount: number;
  categories: CategoryBreakdown[];
};

export type BreakdownData = {
  totalAmount: number;
  chartSlices: ChartSlice[];
  details: GroupBreakdown[];
};

export type CashflowMetrics = {
  currentIncome: number;
  currentExpense: number;
  pastIncome: number;
  pastExpense: number;
  isAllTime: boolean;
};

export type ProfitMetrics = {
  income: number;
  expense: number;
  profit: number;
  startBalance: number;
  endBalance: number;
  isAllTime: boolean;
};

export type WaterfallDataShape = {
  months: {
    month: number;
    name: string;
    value: number;
    startLevel: number;
    endLevel: number;
    isPositive: boolean;
    isCurrentMonth?: boolean;
  }[];
  total: number;
  totalIsPositive: boolean;
  year: number;
};

export type AnalyzeResponse = {
  cashflow: CashflowMetrics;
  income: BreakdownData;
  expense: BreakdownData;
  profit: ProfitMetrics;
  waterfall: WaterfallDataShape;
};

/* ─── Skeleton (unchanged visual) ──────────────────────────── */

function AnalyzeSkeleton() {
  return (
    <div className="p-7.5 flex flex-col gap-15 w-full max-w-full min-w-0 overflow-x-hidden min-h-screen">
      <div className="flex flex-col gap-15 w-full min-w-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-5 w-5 bg-elements-border rounded-md animate-pulse" />
            <div className="h-6 w-40 bg-elements-border rounded-md animate-pulse" />
          </div>
          <div className="h-9 w-32 bg-elements-border rounded-2xl animate-pulse" />
        </div>
        <div className="flex items-center justify-between w-full bg-neutral-200 p-2 rounded-2xl gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-9 flex-1 bg-elements-border rounded-xl animate-pulse"
            />
          ))}
        </div>
        <div className="flex flex-col gap-5">
          <div className="h-52 w-full bg-elements-background border border-elements-border rounded-4xl animate-pulse" />
          <div className="h-40 w-full bg-elements-background border border-elements-border rounded-4xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}

/* ─── Content ──────────────────────────────────────────────── */

function AnalyzeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const timeParam = Number(searchParams.get("time") || DEFAULT_TIME_WINDOW);

  const tw = useTimeWindow();
  const [data, setData] = useState<AnalyzeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    (async () => {
      try {
        const res = await fetch(`/api/analyze?time=${timeParam}`);
        if (!res.ok) throw new Error("Failed to fetch analytics");
        const json = (await res.json()) as AnalyzeResponse;
        if (isMounted) setData(json);
      } catch (err) {
        console.error("Failed to load analytics:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [timeParam]);

  const timeFilterOptions = useTimeFilterOptions();

  const currentTimeFilterName =
    timeFilterOptions.find((o) => o.time === timeParam)?.name ?? "۳۰ روز گذشته";

  const handleTimeFilterChange = (time: number) => {
    router.replace(`/analyze?time=${time}`, { scroll: false });
    tw.close();
  };

  const tabs = [
    { name: "جریان نقدی" },
    { name: "درآمدها" },
    { name: "هزینه‌ها" },
    { name: "سود و زیان" },
  ];

  return (
    <div className="p-7.5 flex flex-col gap-15 w-full max-w-full min-w-0 overflow-x-hidden min-h-screen">
      <div className="flex flex-col gap-15 w-full min-w-0">
        <NavbarTitle title="تحلیل و بررسی پیشرفته">
          <div className="relative" ref={tw.dropdownRef}>
            <button
              type="button"
              onClick={tw.toggle}
              className={`px-3 py-2 rounded-2xl text-xs flex items-center gap-1 ${PrimaryColors.secondary.box}`}
            >
              {currentTimeFilterName}
              <Left height={12} width={12} className="fill-current" />
            </button>

            <TimeWindow
              isMounted={tw.isMounted}
              isVisible={tw.isVisible}
              options={timeFilterOptions}
              onSelect={handleTimeFilterChange}
              activeTime={timeParam}
              align="left"
            />
          </div>
        </NavbarTitle>

        <div className="flex items-center justify-between w-full bg-neutral-200 p-2 rounded-2xl">
          {tabs.map((tab, index) => (
            <div
              key={index}
              className={`py-3.5 px-4 rounded-xl text-xs whitespace-nowrap transition-all cursor-pointer ${
                activeTab === index
                  ? "bg-white text-primary font-bold"
                  : "text-secondary"
              }`}
              onClick={() => setActiveTab(index)}
            >
              {tab.name}
            </div>
          ))}
        </div>

        {activeTab === 0 && (
          <CashFlow
            timeParam={timeParam}
            data={data?.cashflow}
            isLoading={isLoading}
          />
        )}
        {activeTab === 1 && (
          <FinancialAnalysis
            type="income"
            timeParam={timeParam}
            data={data?.income}
            isLoading={isLoading}
          />
        )}
        {activeTab === 2 && (
          <FinancialAnalysis
            type="expense"
            timeParam={timeParam}
            data={data?.expense}
            isLoading={isLoading}
          />
        )}
        {activeTab === 3 && (
          <Profit
            data={data?.profit}
            waterfall={data?.waterfall}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
}

export default function Analyze() {
  return (
    <Suspense fallback={<AnalyzeSkeleton />}>
      <AnalyzeContent />
    </Suspense>
  );
}
