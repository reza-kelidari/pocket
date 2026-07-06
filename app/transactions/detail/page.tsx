"use client";

import Box from "@/components/Box";
import NavbarTitle from "@/components/NavbarTitle";
import useAccounts from "@/utility/accounts/service/useAccounts";
import { AccountColors } from "@/utility/colors";
import { getCategoryById } from "@/utility/transactions/methods";
import useTransactions from "@/utility/transactions/service/useTransactions";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function TransactionDetail() {
  const searchParams = useSearchParams();
  const accounts = useAccounts();
  const router = useRouter();
  const redirect = searchParams.get("redirect") ?? "/";
  const transaction = useTransactions().find(
    (item) => item.id === Number(searchParams.get("id") ?? 0),
  );
  const accountID =
    transaction?.type === "credit" ? transaction?.credit : transaction?.debit;
  const txCategoryCode =
    transaction?.type === "credit"
      ? transaction?.debit
      : (transaction?.credit ?? 0);
  const txCategory = getCategoryById(txCategoryCode);
  const account = useAccounts().find((item) => item.id === accountID);

  const fromAccount = useAccounts().find(
    (item) => item.id === transaction?.credit,
  );
  const toAccount = useAccounts().find(
    (item) => item.id === transaction?.debit,
  );

  const txName =
    transaction?.type === "initial" ? "موجودی اولیه" : transaction?.name;

  useEffect(() => {
    if (accounts.length === 0)
      router.replace(
        `/splash?redirect=${window.location.pathname + window.location.search}`,
      );
  }, []);

  console.log(transaction?.id);

  if (accounts.length === 0) return;

  return (
    <div className="p-7.5 grid gap-15">
      <div className="grid gap-7.5">
        <NavbarTitle title="مشاهده تراکنش" redirect={redirect} />
      </div>

      <Box>
        <h1 className="text-center">{txName}</h1>
        <br />
        <div className="grid gap-5">
          <div className="flex items-center justify-between">
            <h6 className="text-secondary text-[9px]">مبلغ</h6>
            <h3
              className={`text-xs ${transaction?.type === "debit" ? "text-income-primary" : transaction?.type === "credit" ? "text-expense-primary" : ""}`}
            >
              {`${transaction?.value.toLocaleString("fa-ir")}
              ${
                transaction?.type === "debit"
                  ? "+"
                  : transaction?.type === "credit"
                    ? "-"
                    : ""
              }
              ﷼`}
            </h3>
          </div>

          {txCategory ? (
            <div className="flex items-center justify-between">
              <h6 className="text-secondary text-[9px]">دسته‌بندی</h6>
              <h3 className="text-xs">{txCategory.name}</h3>
            </div>
          ) : (
            ""
          )}

          {["debit", "credit", "initial"].includes(transaction?.type ?? "") ? (
            <div className="flex items-center justify-between">
              <h6 className="text-secondary text-[9px]">حساب</h6>
              <h3 className="text-xs flex items-center gap-1.5">
                {account?.name}{" "}
                <span
                  className={`p-1 rounded-4xl ${AccountColors[account?.color ?? "blue1"].primary}`}
                ></span>
              </h3>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h6 className="text-secondary text-[9px]">حساب مقصد</h6>
                <h3 className="text-xs flex items-center gap-1.5">
                  {toAccount?.name}{" "}
                  <span
                    className={`p-1 rounded-4xl ${AccountColors[toAccount?.color ?? "blue1"].primary}`}
                  ></span>
                </h3>
              </div>

              <div className="flex items-center justify-between">
                <h6 className="text-secondary text-[9px]">حساب مبدا</h6>
                <h3 className="text-xs flex items-center gap-1.5">
                  {fromAccount?.name}{" "}
                  <span
                    className={`p-1 rounded-4xl ${AccountColors[fromAccount?.color ?? "blue1"].primary}`}
                  ></span>
                </h3>
              </div>
            </>
          )}

          <div className="flex items-center justify-between">
            <h6 className="text-secondary text-[9px]">برچسب</h6>
            <h3 className="text-xs">
              {transaction?.tag ? transaction.tag : "بدون برچسب"}
            </h3>
          </div>

          <div className="flex items-center justify-between">
            <h6 className="text-secondary text-[9px]">تاریخ</h6>
            <h3 className="text-xs">
              {new Date(transaction?.time ?? 0).toLocaleDateString("fa-ir", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              })}
            </h3>
          </div>

          <div className="flex items-center justify-between">
            <h6 className="text-secondary text-[9px]">تاریخ</h6>
            <h3 className="text-xs">
              {new Date(transaction?.time ?? 0).toLocaleString("fa-ir", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </h3>
          </div>

          {transaction?.note ? <div className="p-4 min-h-25 bg-white rounded-2xl border-elements-border border text-[10px] text-justify">{transaction.note}</div> : ""}
        </div>
      </Box>
    </div>
  );
}
