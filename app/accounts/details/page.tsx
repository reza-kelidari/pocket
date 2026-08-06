"use client";

import Button from "@/components/Button";
import Capsule from "@/components/Capsule";
import ChartView from "@/components/ChartView";
import NavbarTitle from "@/components/NavbarTitle";
import SectionTitle from "@/components/SectionTitle";
import SwipeableElement from "@/components/SwipeableElement";
import TransactionItem from "@/components/TransactionItem";
import Pen from "@/icons/Pen";
import { AccountType } from "@/utility/accounts/types";
import useBalances from "@/utility/balance/service/useBalances";
import { deleteItem, getAll, getItem } from "@/utility/db/Database";
import { DatabaseStores } from "@/utility/keys/database";
import { getAccountBalances } from "@/utility/shared/balancesMethods";
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
  const accountID = searchParams.get("id") ?? "";
  const [swipedItem, setSwipedItem] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<AccountType[]>([]);
  const { setBalances } = useBalances();

  useEffect(() => {
    if (!accountID) router.replace("/accounts");
  }, [accountID, router]);

  useEffect(() => {
    (async () => {
      const [acc, accs, txs] = await Promise.all([
        getItem<AccountType>(accountsStore, accountID),
        getAll<AccountType>(accountsStore),
        getAll<TransactionType>(transactionsStore),
      ]);

      setAccount(acc);
      setAccounts(accs.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
      setTransactions(txs);
    })();
  }, [accountID]);

  const handleDeleteTransaction = async (id: string) => {
    await deleteItem(transactionsStore, id);
    const newTxs = transactions.filter((t) => t.id !== id);
    setTransactions(newTxs);

    setBalances(getAccountBalances(accounts, newTxs));
    setSwipedItem(null);
  };

  if (!accountID || !account) return null;
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
              <SwipeableElement
                isOpen={transaction.id === swipedItem}
                onOpenChange={() => setSwipedItem(transaction.id)}
                onCloseOthers={() => setSwipedItem(null)}
                onEdit={() =>
                  transaction.type !== "initial"
                    ? router.push(`/transactions/edit?id=${transaction.id}`)
                    : router.push(`/accounts/edit?id=${account.id}`)
                }
                onDelete={
                  transaction.type !== "initial"
                    ? () => handleDeleteTransaction(transaction.id)
                    : undefined
                }
                key={transaction.id}
              >
                <TransactionItem account={account} transaction={transaction} />
              </SwipeableElement>
            ))}
          </div>
          <Button href={`/transactions?accounts=${accountID}`}>
            مشاهده همه تراکنش‌ها
          </Button>
        </div>
      </div>
    );
}
