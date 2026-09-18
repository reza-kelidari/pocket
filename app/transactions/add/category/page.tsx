"use client";

import NavbarTitle from "@/components/NavbarTitle";
import { TransactionType } from "@/utility/shared/transactionTypes";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { CREATE_TRANSACTION_KEY } from "../page";
import { TransactionCategories } from "@/utility/shared/transactionCategories";
import Title from "@/components/SectionTitle";

function normalizeForSearch(text: string): string {
  /**
   * Normalizes text for search by replacing Arabic/Persian characters
   * and formatting for case-insensitive comparison.
   * @param text - The text to normalize for search
   * @returns The normalized text suitable for search comparison
   */
  return text
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[أإآ]/g, "ا")
    .replace(/[\u200c\s]+/g, "")
    .toLowerCase();
}

/**
 * Component for selecting transaction categories.
 * Handles category filtering, search, and selection for debit/credit transactions.
 * Persists the selected category in session storage.
 * @param props - No props required; uses URL search params and session storage
 * @returns JSX element representing the category selection UI
 */
export default function CategorySelector() {
  const searchParams = useSearchParams();
  const accountParam = searchParams.get("type") as "debit" | "credit" | null;
  const [selectedCategory, setSelectedCategory] = useState<number>();
  const [transactionType, setTransactionType] = useState<
    TransactionType["type"] | null
  >(null);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const categories =
    transactionType === "debit"
      ? TransactionCategories.income
      : TransactionCategories.expense;

  const normalizedQuery = useMemo(
    () => normalizeForSearch(searchQuery),
    [searchQuery],
  );

  const filteredCategories = useMemo(() => {
    if (!normalizedQuery) return categories;

    return categories
      .map((group) =>
        normalizeForSearch(group.name).includes(normalizedQuery)
          ? group
          : {
              ...group,
              sub: group.sub.filter((sub) =>
                normalizeForSearch(sub.name).includes(normalizedQuery),
              ),
            },
      )
      .filter((group) => group.sub.length > 0);
  }, [categories, normalizedQuery]);

  useEffect(() => {
    const data = sessionStorage.getItem(CREATE_TRANSACTION_KEY);
    if (!data) return;

    try {
      const parsed = JSON.parse(data) as TransactionType;
      setTransactionType(parsed.type);

      const currentSelected = Number(
        accountParam === "debit" ? parsed.credit : parsed.debit,
      );
      setSelectedCategory(currentSelected || 0);
    } catch (e) {}
  }, [accountParam]);

  useEffect(() => {
    if (!normalizedQuery && !!selectedCategory && selectedCategory !== 0) {
      const node = itemRefs.current.get(selectedCategory);
      if (node) {
        node.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [selectedCategory, categories, normalizedQuery]);

  function handleSelect(id: string): void {
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

  const isIncome = transactionType === "debit";

  return (
    <div className="p-7.5 grid gap-15 w-screen overflow-hidden">
      <div className="grid gap-7.5">
        <NavbarTitle title="انتخاب دسته‌بندی" />
      </div>

      <div className="relative">
        <input
          type="search"
          enterKeyHint="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          placeholder="جستجوی دسته‌بندی…"
          className={`w-full rounded-2xl border border-elements-border bg-elements-background px-4 ${searchQuery ? "pl-9" : ""} py-3 text-sm outline-none transition-colors placeholder:text-secondary [&::-webkit-search-cancel-button]:appearance-none ${
            isIncome
              ? "focus:border-income-primary"
              : "focus:border-expense-primary"
          }`}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            aria-label="پاک کردن جستجو"
            className="absolute left-3 top-1/2 -translate-y-1/2 cursor-pointer text-secondary"
          >
            ✕
          </button>
        )}
      </div>

      <div className="grid gap-15">
        {normalizedQuery && filteredCategories.length === 0 ? (
          <div className="animate-fade-in py-8 text-center text-xs text-secondary">
            دسته‌بندی‌ای مطابق «{searchQuery}» یافت نشد.
          </div>
        ) : (
          filteredCategories.map((items) => (
            <div key={items.id} className="grid gap-7.5">
              <Title>{items.name}</Title>
              <div className="grid grid-cols-3 gap-2.5 w-full">
                {items.sub.map((sub) => {
                  const isSelected = selectedCategory === sub.id;

                  return (
                    <div
                      key={sub.id}
                      ref={(el) => {
                        if (el) itemRefs.current.set(sub.id, el);
                        else itemRefs.current.delete(sub.id);
                      }}
                      onClick={() => handleSelect(sub.id.toString())}
                      className={`flex flex-col gap-2 items-center justify-center text-xs rounded-2xl p-2 cursor-pointer transition-all
                    ${
                      transactionType === "debit"
                        ? "bg-income-background border border-income-border"
                        : "bg-expense-background border border-expense-border"
                    }
                    ${!!selectedCategory && !isSelected ? "saturate-25 opacity-75" : ""}
                    ${isSelected ? "scale-110 shadow-lg shadow-zinc-200" : ""}`}
                    >
                      <sub.icon
                        height={40}
                        width={40}
                        className={
                          transactionType === "debit"
                            ? "fill-income-primary"
                            : "fill-expense-primary"
                        }
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
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
