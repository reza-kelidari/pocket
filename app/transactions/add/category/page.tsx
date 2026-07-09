"use client";

import NavbarTitle from "@/components/NavbarTitle";
import { TransactionType } from "@/utility/transactions/types";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CREATE_TRANSACTION_KEY } from "../page";
import { TransactionCategories } from "@/utility/category/constant";
import Title from "@/components/SectionTitle";

export default function CategorySelector() {
  const searchParams = useSearchParams();
  const accountParam = searchParams.get("type") as "debit" | "credit" | null;
  const [selectedCategory, setSelectedCategory] = useState<number>(0);
  const [transactionType, setTransactionType] = useState<
    TransactionType["type"] | null
  >(null);
  const router = useRouter();

  const categories =
    transactionType === "debit"
      ? TransactionCategories.income
      : TransactionCategories.expense;

  useEffect(() => {
    // خواندن آیدی حساب فعلی و نوع تراکنش برای تنظیمات اولیه
    const data = sessionStorage.getItem(CREATE_TRANSACTION_KEY);
    if (!data) return;

    try {
      const parsed = JSON.parse(data) as TransactionType;
      setTransactionType(parsed.type);

      const currentSelected =
        accountParam === "debit" ? parsed.credit : parsed.debit;
      setSelectedCategory(currentSelected || 0);
    } catch (e) {}
  }, [accountParam]);

  function handleSelect(id: number): void {
    const data = sessionStorage.getItem(CREATE_TRANSACTION_KEY);
    if (!data) {
      router.back();
      return;
    }

    try {
      const currentTransaction = JSON.parse(data) as TransactionType;
      let update: Partial<TransactionType> = {};

      if (currentTransaction.type === "debit") {
        update = { credit: id };
      } else if (currentTransaction.type === "credit") {
        update = { debit: id };
      }

      const newData = JSON.stringify({ ...currentTransaction, ...update });
      sessionStorage.setItem(CREATE_TRANSACTION_KEY, newData);
    } catch (e) {}

    router.back();
  }

  if (!accountParam) return null;
  else
    return (
      <div className="p-7.5 grid gap-15 w-screen overflow-hidden">
        <div className="grid gap-7.5">
          <NavbarTitle title="انتخاب دسته‌بندی" />
        </div>
        <div className="grid gap-15">
          {categories.map((items) => (
            <div key={items.id} className="grid gap-7.5">
              <Title>{items.name}</Title>
              <div className="grid grid-cols-3 gap-2.5 w-full">
                {items.sub.map((sub) => (
                  <div
                    key={sub.id}
                    className={`flex flex-col gap-2 items-center text-xs rounded-2xl p-2
                      ${
                        transactionType === "debit"
                          ? "bg-income-background border border-income-border"
                          : "bg-expense-background border border-expense-border"
                      }`}
                  >
                    <sub.icon
                      height={40}
                      width={40}
                      className={
                        transactionType === "debit"
                          ? "fill-income-primary"
                          : "fill-expense-primary"
                      }
                      onClick={() => handleSelect(sub.id)}
                    />
                    <span
                      className={`text-[9px] ${
                        transactionType === "debit"
                          ? "text-income-primary"
                          : "text-expense-primary"
                      } text-center`}
                    >
                      {sub.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
}
