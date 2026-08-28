"use client";
import { memo, useMemo } from "react";
import Box from "@/components/Box";
import DonutChart from "@/components/DonutChart";
import { TransactionType } from "@/utility/shared/transactionTypes";
import { TransactionCategories } from "@/utility/shared/transactionCategories";
import { TagType } from "@/utility/shared/tagTypes";
import { getCutoffTimestamp } from "@/utility/shared/timeMethods";
import AnalyzeIncomeLoading from "@/components/Skeletons/AnalyzeIncomeLoading";

const ALL_TIME_PARAM = 36500;
const UNCATEGORIZED_ID = -1;

const CONFIG = {
  income: {
    txType: "debit" as const,
    catField: "credit" as const,
    categories: TransactionCategories.income,
    colors: ["#009764", "#19af7c", "#55c28b", "#79d99e", "#97e3ba"] as const,
    dotClasses: [
      "bg-income-primary",
      "bg-income-second",
      "bg-income-third",
      "bg-income-forth",
      "bg-income-fifth",
    ] as const,
    title: "سهم منابع درآمدی",
    detailsTitle: "جزئیات درآمدها",
    emptyText: "در این بازه درآمدی ثبت نشده است.",
    otherLabel: "سایر درآمد‌ها",
    primaryColorClass: "text-income-primary",
  },
  expense: {
    txType: "credit" as const,
    catField: "debit" as const,
    categories: TransactionCategories.expense,
    colors: ["#a40000", "#b42a2a", "#c25555", "#d97979", "#e39797"] as const,
    dotClasses: [
      "bg-expense-primary",
      "bg-expense-second",
      "bg-expense-third",
      "bg-expense-forth",
      "bg-expense-fifth",
    ] as const,
    title: "سهم منابع هزینه‌ای",
    detailsTitle: "جزئیات هزینه‌ها",
    emptyText: "در این بازه هزینه‌ای ثبت نشده است.",
    otherLabel: "سایر هزینه‌ها",
    primaryColorClass: "text-expense-primary",
  },
} as const;

type AnalysisType = keyof typeof CONFIG;
type TagBreakdown = {
  tagId: string;
  tagName: string;
  amount: number;
};
type CategoryBreakdown = {
  id: number;
  name: string;
  amount: number;
  tags: TagBreakdown[];
  untaggedAmount: number;
};
type GroupBreakdown = {
  id: number;
  name: string;
  amount: number;
  categories: CategoryBreakdown[];
};
type ChartSlice = {
  id: number | "other";
  name: string;
  amount: number;
  percent: number;
  color: string;
  dotClass: string;
};
type CatAgg = {
  total: number;
  byTag: Map<string, number>;
  untagged: number;
};

function FinancialAnalysis({
  type,
  timeParam,
  transactions,
  tags = [],
  isLoading,
}: {
  type: AnalysisType;
  timeParam: number;
  transactions: TransactionType[];
  tags?: TagType[];
  isLoading: boolean;
}) {
  const conf = CONFIG[type];

  const { totalAmount, chartSlices, details } = useMemo(() => {
    const cutoff =
      timeParam === ALL_TIME_PARAM ? 0 : getCutoffTimestamp(timeParam);
    const categoryMeta = new Map<
      number,
      { name: string; groupId: number; groupName: string }
    >();
    for (const group of conf.categories) {
      for (const sub of group.sub) {
        categoryMeta.set(sub.id, {
          name: sub.name,
          groupId: group.id,
          groupName: group.name,
        });
      }
    }
    categoryMeta.set(UNCATEGORIZED_ID, {
      name: "دسته‌بندی‌نشده",
      groupId: 0,
      groupName: "سایر",
    });

    const tagNameById = new Map(tags.map((t) => [t.id, t.name]));
    const catMap = new Map<number, CatAgg>();
    let total = 0;

    for (const tx of transactions) {
      if (tx.time < cutoff) continue;
      if (tx.type !== conf.txType) continue;
      total += tx.value;
      const rawCatId = Number(tx[conf.catField]);
      const catId = Number.isNaN(rawCatId) ? UNCATEGORIZED_ID : rawCatId;
      let entry = catMap.get(catId);
      if (!entry) {
        entry = { total: 0, byTag: new Map(), untagged: 0 };
        catMap.set(catId, entry);
      }
      entry.total += tx.value;
      if (tx.tag) {
        entry.byTag.set(tx.tag, (entry.byTag.get(tx.tag) || 0) + tx.value);
      } else {
        entry.untagged += tx.value;
      }
    }

    let slices: ChartSlice[] = [];
    if (total > 0) {
      const sorted = Array.from(catMap.entries())
        .filter(([, e]) => e.total > 0)
        .map(([id, e]) => ({
          id,
          name: categoryMeta.get(id)?.name ?? "نامشخص",
          amount: e.total,
        }))
        .sort((a, b) => b.amount - a.amount);

      const top: typeof sorted = [];
      let otherAmount = 0;
      for (const cat of sorted) {
        const percent = (cat.amount / total) * 100;
        if (percent >= 2) {
          top.push(cat);
        } else {
          otherAmount += cat.amount;
        }
      }

      top.forEach((cat, i) => {
        slices.push({
          id: cat.id,
          name: cat.name,
          amount: cat.amount,
          percent: cat.amount / total,
          color: conf.colors[i] ?? conf.colors[conf.colors.length - 1],
          dotClass:
            conf.dotClasses[i] ?? conf.dotClasses[conf.dotClasses.length - 1],
        });
      });

      if (otherAmount > 0) {
        slices.push({
          id: "other",
          name: conf.otherLabel,
          amount: otherAmount,
          percent: otherAmount / total,
          color: conf.colors[conf.colors.length - 1],
          dotClass: conf.dotClasses[conf.dotClasses.length - 1],
        });
      }
    }

    const groupMap = new Map<
      number,
      { name: string; amount: number; categories: CategoryBreakdown[] }
    >();
    for (const [catId, entry] of catMap) {
      if (entry.total <= 0) continue;
      const meta = categoryMeta.get(catId);
      if (!meta) continue;
      const hasAnyTag = entry.byTag.size > 0;
      const tagRows: TagBreakdown[] = hasAnyTag
        ? Array.from(entry.byTag.entries())
            .map(([tagId, amount]) => ({
              tagId,
              tagName: tagNameById.get(tagId) || "برچسب ناشناخته",
              amount,
            }))
            .sort((a, b) => b.amount - a.amount)
        : [];
      const catRow: CategoryBreakdown = {
        id: catId,
        name: meta.name,
        amount: entry.total,
        tags: tagRows,
        untaggedAmount: hasAnyTag ? entry.untagged : 0,
      };
      let group = groupMap.get(meta.groupId);
      if (!group) {
        group = { name: meta.groupName, amount: 0, categories: [] };
        groupMap.set(meta.groupId, group);
      }
      group.amount += entry.total;
      group.categories.push(catRow);
    }

    const groupedDetails: GroupBreakdown[] = Array.from(groupMap.entries())
      .map(([id, g]) => ({
        id,
        name: g.name,
        amount: g.amount,
        categories: g.categories.sort((a, b) => b.amount - a.amount),
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      totalAmount: total,
      chartSlices: slices,
      details: groupedDetails,
    };
  }, [
    transactions,
    timeParam,
    tags,
    conf.txType,
    conf.catField,
    conf.categories,
    conf.colors,
    conf.dotClasses,
    conf.otherLabel,
  ]);

  const donutData = useMemo(
    () => chartSlices.map((s) => ({ percent: s.percent, color: s.color })),
    [chartSlices],
  );

  const getCategoryPercent = (amount: number) => {
    if (totalAmount === 0) return 0;
    return Number(((amount / totalAmount) * 100).toFixed(1));
  };

  if (isLoading) {
    return <AnalyzeIncomeLoading />;
  }

  return (
    <div className="w-full flex flex-col gap-15">
      <Box className="flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <span className="text-xs text-secondary">{conf.title}</span>
          <span className={`text-sm font-bold ${conf.primaryColorClass}`}>
            {totalAmount.toLocaleString("fa-IR")} ﷼
          </span>
        </div>
        {totalAmount > 0 ? (
          <div className="flex items-center gap-6 mt-4">
            <DonutChart data={donutData} />
            <div className="flex flex-col gap-3 flex-1 min-w-0">
              {chartSlices.map((slice) => {
                const pct = getCategoryPercent(slice.amount);
                return (
                  <div
                    key={String(slice.id)}
                    className="flex items-center gap-2"
                  >
                    <div
                      className={`p-1.5 rounded-full shrink-0 ${slice.dotClass}`}
                    />
                    <span
                      className={`text-xs ${pct > 10 && slice.id !== "other" ? "text-black" : "text-secondary"} truncate`}
                    >
                      {pct.toLocaleString("fa-IR")}٪ - {slice.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-xs text-secondary text-center mt-6 py-2">
            {conf.emptyText}
          </p>
        )}
      </Box>
      <Box className="gap-10">
        <h3 className="text-xs text-secondary">{conf.detailsTitle}</h3>
        {details.length === 0 ? (
          <p className="text-xs text-secondary text-center py-4">
            {conf.emptyText}
          </p>
        ) : (
          details.map((group) => (
            <div key={group.id} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-black">
                    {group.name}
                  </span>
                  <span className="text-xs font-bold text-black">
                    {group.amount.toLocaleString("fa-IR")} ﷼
                  </span>
                </div>
                <div className="h-px w-full bg-elements-border" />
              </div>
              <div className="flex flex-col gap-6">
                {group.categories.map((cat) => {
                  const showTagTree =
                    cat.tags.length > 0 || cat.untaggedAmount > 0;
                  return (
                    <div key={cat.id} className="flex flex-col gap-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-secondary">
                          {cat.name}
                        </span>
                        <span className="text-xs text-secondary">
                          {cat.amount.toLocaleString("fa-IR")} ﷼
                        </span>
                      </div>
                      {showTagTree && (
                        <div className="relative flex flex-col gap-1 mr-2 pr-2">
                          <div className="absolute right-0 top-1 bottom-1 w-0.5 rounded-full bg-secondary/40" />
                          {cat.tags.map((tag) => (
                            <div
                              key={tag.tagId}
                              className="flex items-center justify-between py-1"
                            >
                              <span className="text-[10px] text-secondary">
                                {tag.tagName}
                              </span>
                              <span className="text-[10px] text-secondary">
                                {tag.amount.toLocaleString("fa-IR")} ﷼
                              </span>
                            </div>
                          ))}
                          {cat.untaggedAmount > 0 && (
                            <div className="flex items-center justify-between py-1">
                              <span className="text-[10px] text-secondary">
                                بدون برچسب
                              </span>
                              <span className="text-[10px] text-secondary">
                                {cat.untaggedAmount.toLocaleString("fa-IR")} ﷼
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </Box>
    </div>
  );
}

export default memo(FinancialAnalysis);
