"use client";

import Button from "@/components/Button";
import Capsule from "@/components/Capsule";
import ChartView from "@/components/ChartView";
import NavbarTitle from "@/components/NavbarTitle";
import SectionTitle from "@/components/SectionTitle";
import TransactionItem from "@/components/TransactionItem";
import Pen from "@/icons/Pen";
import { AccountType } from "@/utility/accounts/types";
import { getAll, getItem } from "@/utility/db/Database";
import { DatabaseStores } from "@/utility/keys/database";
import { getLatestTransactions } from "@/utility/shared/transactionsMethods";
import { TransactionType } from "@/utility/transactions/types";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function AccountsDetails() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { accountsStore, transactionsStore } = DatabaseStores;
  const [account, setAccount] = useState<AccountType>();
  const [transactions, setTransactions] = useState<TransactionType[]>([]);
  const accountID = Number(searchParams.get("id"));

  useEffect(() => {
    if (isNaN(accountID)) router.replace("/accounts");
  }, [accountID, router]);

  useEffect(() => {
    (async () => {
      setAccount((await getItem<AccountType>(accountsStore, accountID)));

      setTransactions((await getAll<TransactionType>(transactionsStore)));
    })();
  }, [accountID]);

  if (isNaN(accountID) || !account) return null;
  else
    return (
      <div className="p-7.5 grid gap-15">
        <div className="grid gap-7.5">
          <NavbarTitle title={account.name}>
            <Capsule Icon={Pen} href={`/accounts/edit?id=${account.id}`}>
              اصلاح حساب
            </Capsule>
          </NavbarTitle>
        </div>

        <ChartView
          title={`موجودی ${account.name}`}
          color={account.color}
          timeSelector
          accountID={account.id}
          transactions={transactions}
        />

        <div className="grid gap-7.5">
          <SectionTitle>{`تراکنش‌های اخیر ${account.name}`}</SectionTitle>

          <div className="flex flex-col w-full gap-2.5">
            {getLatestTransactions(
              transactions.filter((item) =>
                [item.debit, item.credit].includes(accountID),
              ),
              5,
            ).map((transaction) => (
              <TransactionItem
                key={transaction.id}
                account={account}
                transaction={transaction}
              />
            ))}
          </div>
          <Button href={`/transactions?accounts=${accountID}`}>
            مشاهده همه تراکنش‌ها
          </Button>
        </div>
      </div>
    );
}
