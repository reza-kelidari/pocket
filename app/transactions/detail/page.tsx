"use client";

import Box from "@/components/Box";
import Capsule from "@/components/Capsule";
import NavbarTitle from "@/components/NavbarTitle";
import { AccountColors } from "@/utility/shared/colors";
import { getCategoryById } from "@/utility/shared/transactionsMethods";
import Pen from "@/icons/Pen";
import { useRouter, useSearchParams } from "next/navigation";
import { ComponentProps, useEffect, useState } from "react";
import { TagType } from "@/utility/shared/tagTypes";
import { getAll, getItem } from "@/utility/db/Database";
import { AccountType } from "@/utility/accounts/types";
import { TransactionType } from "@/utility/transactions/types";
import { DatabaseStores } from "@/utility/keys/database";

export default function TransactionDetail() {
  const searchParams = useSearchParams();
  const [transaction, setTransaction] = useState<TransactionType>();
  const router = useRouter();
  const [tagName, setTagName] = useState<string>("");
  const { accountsStore, transactionsStore, tagsStore } = DatabaseStores;
  const [account, setAccount] = useState<AccountType>();
  const [fromAccount, setFromAccount] = useState<AccountType>();
  const [toAccount, setToAccount] = useState<AccountType>();

  const txID = searchParams.get("id") ?? "";

  const isTxDebit =
    transaction?.type === "debit" || transaction?.type === "initial";
  const categoryID = isTxDebit ? transaction?.credit : transaction?.debit;
  const txCategory = getCategoryById(categoryID ?? "");

  const txName =
    transaction?.type === "initial" ? "موجودی اولیه" : transaction?.name;

  const txDate = new Date(transaction?.time ?? 0);

  useEffect(() => {
    if (!txID) router.back();
  }, [router]);

  useEffect(() => {
    (async () => {
      const tx = (await getItem(transactionsStore, txID)) as TransactionType;
      setTransaction(tx);

      const accountID = tx.type === "credit" ? tx.credit : tx.debit;
      setAccount(await getItem(accountsStore, accountID));

      if (tx?.tag)
        setTagName((await getItem<TagType>(tagsStore, tx.tag))!.name);

      setFromAccount((await getItem(accountsStore, tx.credit)) as AccountType);
      setToAccount((await getItem(accountsStore, tx.debit)) as AccountType);
    })();
  }, []);

  if (!transaction) return null;
  else
    return (
      <div className="p-7.5 grid gap-15">
        <div className="grid gap-7.5">
          <NavbarTitle title="مشاهده تراکنش">
            {transaction.type === "initial" ? (
              <Capsule
                href={`/accounts/edit?id=${transaction?.debit}`}
                Icon={Pen}
              >
                ویرایش حساب
              </Capsule>
            ) : (
              <Capsule
                href={`/transactions/edit?id=${transaction.id}`}
                Icon={Pen}
              >
                ویرایش
              </Capsule>
            )}
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

            {txCategory && (
              <InfoRow name="دسته‌بندی">{txCategory.name}</InfoRow>
            )}

            {["debit", "credit", "initial"].includes(
              transaction?.type ?? "",
            ) ? (
              <InfoRow
                name="حساب"
                className="text-xs flex items-center gap-1.5"
              >
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
              {tagName || "بدون برچسب"}
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
