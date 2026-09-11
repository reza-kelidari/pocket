"use client";
import NavbarTitle from "@/components/NavbarTitle";
import Button from "@/components/Button";
import Title from "@/components/SectionTitle";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { filterToUrl, parseStringArray } from "../methods";
import { TransactionCategories } from "@/utility/shared/transactionCategories";

const allCategories = [
  ...TransactionCategories.expense,
  ...TransactionCategories.income,
];

export default function CategoryFilter() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [selectedCategories, setSelectedCategories] = useState<string[]>(() =>
    parseStringArray(searchParams.get("categories")),
  );

  const handleToggle = (id: string) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const hasSelection = selectedCategories.length > 0;

  const applyHref = `/transactions${filterToUrl({
    timeWindow: Number(searchParams.get("time")) || 30,
    accounts: parseStringArray(searchParams.get("accounts")),
    categories: selectedCategories,
    tags: parseStringArray(searchParams.get("tags")),
  })}`;

  const INCOME_CATEGORY_IDS = new Set<number>();
  TransactionCategories.income.forEach((g) => {
    g.sub.forEach((s) => INCOME_CATEGORY_IDS.add(s.id));
  });

  return (
    <div className="flex flex-col h-dvh overflow-hidden">
      {/* هدر */}
      <div className="shrink-0 p-7.5 pb-0">
        <NavbarTitle title="دسته‌بندی‌ها" />
      </div>

      {/* لیست — اسکرول‌شونده */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none p-7.5">
        <div className="grid gap-15 animate-fade-in">
          {allCategories.map((category) => {
            return (
              <div key={category.id} className="grid gap-7.5">
                <Title>{category.name}</Title>
                <div className="grid grid-cols-3 gap-2.5 w-full">
                  {category.sub.map((sub) => {
                    const isIncome = INCOME_CATEGORY_IDS.has(sub.id);
                    const id = sub.id.toString();
                    const isSelected = selectedCategories.includes(id);

                    return (
                      <div
                        key={sub.id}
                        onClick={() => handleToggle(id)}
                        className={`flex flex-col gap-2 items-center justify-center text-xs rounded-2xl p-2 cursor-pointer transition-all
                          ${
                            isIncome
                              ? "bg-income-background border border-income-border"
                              : "bg-expense-background border border-expense-border"
                          }
                          ${
                            hasSelection && !isSelected
                              ? "saturate-25 opacity-75"
                              : ""
                          }
                          ${isSelected ? "scale-110 shadow-lg shadow-zinc-200" : ""}`}
                      >
                        <sub.icon
                          height={40}
                          width={40}
                          className={
                            isIncome
                              ? "fill-income-primary"
                              : "fill-expense-primary"
                          }
                        />
                        <span
                          className={`text-[9px] ${
                            isIncome
                              ? "text-income-primary"
                              : "text-expense-primary"
                          } text-center`}
                        >
                          {sub.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="shrink-0 grid gap-2 p-7.5 pt-4 bg-white/95 backdrop-blur border-t border-elements-border">
        {hasSelection && (
          <Button secondary onClick={() => setSelectedCategories([])}>
            حذف فیلترها ({selectedCategories.length.toLocaleString("fa-ir")}{" "}
            دسته‌بندی)
          </Button>
        )}
        <Button onClick={() => router.replace(applyHref)}>اعمال فیلتر</Button>
      </div>
    </div>
  );
}
