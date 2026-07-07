"use client";

import Box from "@/components/Box";
import Capsule from "@/components/Capsule";
import NavbarTitle from "@/components/NavbarTitle";
import { useAccounts } from "@/utility/accounts/service/useAccounts";
import { AccountColors } from "@/utility/colors";
import { getCategoryById } from "@/utility/transactions/methods";
import useTransactions from "@/utility/transactions/service/useTransactions";
import Pen from "@/icons/Pen";
import { useRouter, useSearchParams } from "next/navigation";
import { ComponentProps, useEffect, useState } from "react";
import { useRedirect } from "@/utility/redirect/service/useRedirect";

export default function TransactionDetail() {
  const searchParams = useSearchParams();
  const { getAccounts } = useAccounts();
  const router = useRouter();
  const { add: addRedirect } = useRedirect();
  const transaction = useTransactions().find(
    (item) => item.id === Number(searchParams.get("id") ?? 0),
  );
  const isTxDebit = transaction?.type === "debit";
  const accountID = isTxDebit ? transaction?.debit : transaction?.credit;
  const categoryID = isTxDebit ? transaction?.credit : transaction?.debit;
  const txCategory = getCategoryById(categoryID ?? 0);
  const account = getAccounts().find((item) => item.id === accountID);
  const [forwardRedirect, setForwardRedirect] = useState("");

  const fromAccount = getAccounts().find(
    (item) => item.id === transaction?.credit,
  );
  const toAccount = getAccounts().find(
    (item) => item.id === transaction?.debit,
  );

  const txName =
    transaction?.type === "initial" ? "موجودی اولیه" : transaction?.name;

  const txDate = new Date(transaction?.time ?? 0);

  useEffect(() => {
    setForwardRedirect(window.location.pathname + window.location.search);

    if (getAccounts().length === 0) router.replace(`/splash`);
  }, [forwardRedirect]);

  useEffect(() => {
    addRedirect(forwardRedirect);
  }, [forwardRedirect, addRedirect]);

  if (getAccounts().length === 0) return;

  return (
    <div className="p-7.5 grid gap-15">
      <div className="grid gap-7.5">
        <NavbarTitle title="مشاهده تراکنش">
          <Capsule href={`/transactions/edit?id=${transaction?.id}`} Icon={Pen}>
            ویرایش
          </Capsule>
        </NavbarTitle>
      </div>

      <Box>
        <h1 className="text-center">{txName}</h1>
        <br />
        <div className="grid gap-5">
          <InfoRow
            name="مبلغ"
            className={`text-xs ${isTxDebit ? "text-income-primary" : transaction?.type === "credit" ? "text-expense-primary" : ""}`}
          >
            {`${transaction?.value.toLocaleString("fa-ir")}
              ${isTxDebit ? "+" : transaction?.type === "credit" ? "-" : ""}
              ﷼`}
          </InfoRow>

          {txCategory && <InfoRow name="دسته‌بندی">{txCategory.name}</InfoRow>}

          {["debit", "credit", "initial"].includes(transaction?.type ?? "") ? (
            <InfoRow name="حساب" className="text-xs flex items-center gap-1.5">
              {account?.name}{" "}
              <span
                className={`p-1 rounded-4xl ${AccountColors[account?.color ?? "blue1"].primary}`}
              ></span>
            </InfoRow>
          ) : (
            <>
              <InfoRow
                name="حساب مقصد"
                className="text-xs flex items-center gap-1.5"
              >
                {toAccount?.name}{" "}
                <span
                  className={`p-1 rounded-4xl ${AccountColors[toAccount?.color ?? "blue1"].primary}`}
                ></span>
              </InfoRow>

              <InfoRow
                name="حساب مبدا"
                className="text-xs flex items-center gap-1.5"
              >
                {fromAccount?.name}{" "}
                <span
                  className={`p-1 rounded-4xl ${AccountColors[fromAccount?.color ?? "blue1"].primary}`}
                ></span>
              </InfoRow>
            </>
          )}

          <InfoRow name="برچسب" className="text-xs flex items-center gap-1.5">
            {transaction?.tag ? transaction.tag : "بدون برچسب"}
          </InfoRow>

          <InfoRow name="تاریخ" className="text-xs flex items-center gap-1.5">
            {txDate.toLocaleDateString("fa-ir", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            })}
          </InfoRow>

          <InfoRow name="ساعت" className="text-xs flex items-center gap-1.5">
            {txDate.toLocaleString("fa-ir", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </InfoRow>

          {transaction?.note && (
            <div className="p-4 min-h-25 bg-white rounded-2xl border-elements-border border text-[10px] text-justify">
              {transaction.note}
            </div>
          )}
        </div>
      </Box>
    </div>
  );
}

type InfoRowPropsType = ComponentProps<"h3"> & {
  name: string;
  children: React.ReactNode;
};

function InfoRow({ name, children, ...props }: InfoRowPropsType) {
  return (
    <div className="flex items-center justify-between">
      <h6 className="text-secondary text-[9px]">{name}</h6>
      <h3 className="text-xs" {...props}>
        {children}
      </h3>
    </div>
  );
}
