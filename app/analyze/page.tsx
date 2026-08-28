"use client";

import NavbarTitle from "@/components/NavbarTitle";
import { useState, useMemo, JSX, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { timeFilters } from "@/app/transactions/methods";
import { toJalaliDateArray } from "@/utility/shared/timeMethods";
import Left from "@/icons/Left";
import CashFlow from "./components/CashFlow";
import Profit from "./components/Profit";
import { PrimaryColors } from "@/utility/shared/colors";
import { getAll } from "@/utility/db/Database";
import { DatabaseStores } from "@/utility/keys/database";
import { TransactionType } from "@/utility/shared/transactionTypes";
import TimeWindow from "@/components/TimeWindow";
import { useTimeWindow } from "@/utility/shared/useTimeWindow";
import { TagType } from "@/utility/shared/tagTypes";
import FinancialAnalysis from "./components/FinancialAnalysis";

type TabType = { name: string; component: JSX.Element };

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
          <div className="h-9 flex-1 bg-elements-border rounded-xl animate-pulse" />
          <div className="h-9 flex-1 bg-elements-border rounded-xl animate-pulse" />
          <div className="h-9 flex-1 bg-elements-border rounded-xl animate-pulse" />
          <div className="h-9 flex-1 bg-elements-border rounded-xl animate-pulse" />
        </div>
        <div className="flex flex-col gap-5">
          <div className="h-52 w-full bg-elements-background border border-elements-border rounded-4xl animate-pulse" />
          <div className="h-40 w-full bg-elements-background border border-elements-border rounded-4xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}

function AnalyzeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const timeParam = Number(searchParams.get("time") || 29);

  const tw = useTimeWindow();

  const [transactions, setTransactions] = useState<TransactionType[]>([]);
  const [tags, setTags] = useState<TagType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setIsLoading(true);
      const [txs, allTags] = await Promise.all([
        getAll<TransactionType>(DatabaseStores.transactionsStore),
        getAll<TagType>(DatabaseStores.tagsStore),
      ]);
      if (!isMounted) return;
      setTransactions(txs.filter((tx) => tx.type !== "transfer"));
      setTags(allTags);
      setIsLoading(false);
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const timeFilterOptions = useMemo(
    () => timeFilters(toJalaliDateArray(new Date())),
    [],
  );

  const currentTimeFilterName = useMemo(
    () =>
      timeFilterOptions.find((o) => o.time === timeParam)?.name ??
      "۳۰ روز گذشته",
    [timeParam, timeFilterOptions],
  );

  const handleTimeFilterChange = (time: number) => {
    router.replace(`/analyze?time=${time}`, { scroll: false });
    tw.close();
  };

  const tabs: TabType[] = [
    {
      name: "جریان نقدی",
      component: (
        <CashFlow
          timeParam={timeParam}
          transactions={transactions}
          isLoading={isLoading}
        />
      ),
    },
    {
      name: "درآمد‌ها",
      component: (
        <FinancialAnalysis
          type="income"
          timeParam={timeParam}
          transactions={transactions}
          tags={tags}
          isLoading={isLoading}
        />
      ),
    },
    {
      name: "هزینه‌ها",
      component: (
        <FinancialAnalysis
          type="expense"
          timeParam={timeParam}
          transactions={transactions}
          tags={tags}
          isLoading={isLoading}
        />
      ),
    },
    {
      name: "سود و زیان",
      component: (
        <Profit
          timeParam={timeParam}
          transactions={transactions}
          isLoading={isLoading}
        />
      ),
    },
  ];

  const [activeTab, setActiveTab] = useState<number>(0);

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

        {tabs.map((tab, index) => (
          <div
            key={tab.name}
            className={activeTab === index ? "contents" : "hidden"}
          >
            {tab.component}
          </div>
        ))}
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
