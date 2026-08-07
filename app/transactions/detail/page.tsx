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

  const [isLoading, setIsLoading] = useState(true);

  const txID = searchParams.get("id") ?? "";

  const isTxDebit =
    transaction?.type === "debit" || transaction?.type === "initial";
  const categoryID = isTxDebit ? transaction?.credit : transaction?.debit;
  const txCategory = getCategoryById(categoryID ?? "");

  const txName =
    transaction?.type === "initial" ? "موجودی اولیه" : transaction?.name;

  const txTime = Number(transaction?.time) || 0;
  const txDate = new Date(txTime);
  const txValue = Number(transaction?.value) || 0;

  useEffect(() => {
    if (!txID) {
      router.back();
      return;
    }

    (async () => {
      try {
        const tx = (await getItem(transactionsStore, txID)) as TransactionType;
        if (!tx) return;

        setTransaction(tx);

        const accountID = tx.type === "credit" ? tx.credit : tx.debit;

        const promises = [
          getItem(accountsStore, accountID),
          getItem(accountsStore, tx.credit),
          getItem(accountsStore, tx.debit),
        ];

        if (tx.tag) {
          promises.push(getItem<TagType>(tagsStore, tx.tag));
        }

        const results = await Promise.all(promises);

        setAccount(results[0] as AccountType);
        setFromAccount(results[1] as AccountType);
        setToAccount(results[2] as AccountType);

        if (tx.tag && results[3]) {
          setTagName((results[3] as TagType).name);
        }
      } catch (error) {
        console.error("Failed to load transaction details:", error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [txID, router, accountsStore, transactionsStore, tagsStore]);

  if (isLoading || !transaction) {
    return (
      <div className="p-7.5 grid gap-15">
        <div className="grid gap-7.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <div className="h-5 w-5 bg-elements-border rounded-md animate-pulse"></div>
              <div className="h-6 w-32 bg-elements-border rounded-md animate-pulse"></div>
            </div>
            <div className="h-8 w-24 bg-elements-border rounded-4xl animate-pulse"></div>
          </div>
        </div>
        <Box className="animate-pulse">
          <div className="h-6 w-1/3 mx-auto bg-elements-border rounded-md mb-8"></div>
          <div className="grid gap-5">
            <div className="h-4 w-full bg-elements-border rounded-md"></div>
            <div className="h-4 w-full bg-elements-border rounded-md"></div>
            <div className="h-4 w-2/3 bg-elements-border rounded-md"></div>
            <div className="h-20 w-full bg-elements-border rounded-2xl mt-4"></div>
          </div>
        </Box>
      </div>
    );
  }

  return (
    <div className="p-7.5 grid gap-15 animate-fade-in">
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
            {`${txValue.toLocaleString("fa-ir")} ${isTxDebit ? "+" : transaction?.type === "credit" ? "-" : ""} ﷼`}
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
