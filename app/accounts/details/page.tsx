"use client";

import Button from "@/components/Button";
import Capsule from "@/components/Capsule";
import CapsuleLoading from "@/components/CapsuleLoading";
import ChartView from "@/components/ChartContainer";
import ChartContainerLoading from "@/components/ChartContainerLoading";
import NavbarTitle from "@/components/NavbarTitle";
import SectionTitle from "@/components/SectionTitle";
import SwipeableElement from "@/components/SwipeableElement";
import TransactionItem from "@/components/TransactionItem";
import TransactionItemLoading from "@/components/TransactionItemLoading";
import Pen from "@/icons/Pen";
import { AccountType } from "@/utility/accounts/types";
import useBalances from "@/utility/balance/service/useBalances";
import { deleteItem, getAll, getItem } from "@/utility/db/Database";
import { DatabaseStores } from "@/utility/keys/database";
import { getAccountBalances } from "@/utility/shared/balancesMethods";
import { PrimaryColors } from "@/utility/shared/colors";
import { getLatestTransactions } from "@/utility/shared/transactionsMethods";
import { TransactionType } from "@/utility/shared/transactionTypes";
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
  const [dragCounter, setDragCounter] = useState(0);
  const [accounts, setAccounts] = useState<AccountType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { setBalances } = useBalances();

  useEffect(() => {
    if (!accountID) router.replace("/accounts");
  }, [accountID, router]);

  useEffect(() => {
    if (!accountID) return;

    (async () => {
      setIsLoading(true);
      const [acc, accs, txs] = await Promise.all([
        getItem<AccountType>(accountsStore, accountID),
        getAll<AccountType>(accountsStore),
        getAll<TransactionType>(transactionsStore),
      ]);

      setAccount(acc);
      setAccounts(accs);
      setTransactions(txs);
      setIsLoading(false);
    })();
  }, [accountID, accountsStore, transactionsStore]);

  const handleDeleteTransaction = async (id: string) => {
    await deleteItem(transactionsStore, id);
    const newTxs = transactions.filter((t) => t.id !== id);
    setTransactions(newTxs);

    setBalances(getAccountBalances(accounts, newTxs));
    setSwipedItem(null);
  };

  if (!accountID) return null;
  else
    return (
      <div className="p-7.5 grid gap-15 w-full max-w-full min-w-0 overflow-x-hidden">
        <div className="grid gap-7.5">
          <NavbarTitle
            title={isLoading ? "جزئیات حساب" : (account?.name ?? "")}
          >
            {isLoading ? (
              <CapsuleLoading />
            ) : (
              <Capsule
                Icon={Pen}
                href={`/accounts/edit?id=${account?.id}`}
                className={`${PrimaryColors.secondary.box} animate-fade-in`}
              >
                اصلاح حساب
              </Capsule>
            )}
          </NavbarTitle>
        </div>

        {isLoading ? (
          <ChartContainerLoading />
        ) : (
          <div className="animate-fade-in w-full min-w-0">
            <ChartView
              title={`موجودی ${account?.name}`}
              color={account?.color}
              timeSelector
              accountID={account?.id}
              transactions={transactions}
            />
          </div>
        )}

        <div className="grid gap-7.5 w-full min-w-0">
          {isLoading ? (
            <div className="h-6 w-40 bg-elements-border rounded-md animate-pulse"></div>
          ) : (
            <SectionTitle>{`تراکنش‌های اخیر ${account?.name}`}</SectionTitle>
          )}

          {isLoading ? (
            <div className="flex flex-col w-full gap-2.5">
              {[0, 1, 2, 3].map((item) => (
                <TransactionItemLoading key={item} />
              ))}
            </div>
          ) : !!account ? (
            <div className="flex flex-col w-full gap-2.5 animate-fade-in">
              {getLatestTransactions(
                transactions.filter((item) =>
                  [item.debit, item.credit].includes(accountID),
                ),
                5,
              ).map((transaction) => (
                <SwipeableElement
                  isOpen={transaction.id === swipedItem}
                  onOpenChange={() => setSwipedItem(transaction.id)}
                  onCloseOthers={() => {
                    setSwipedItem(null);
                    setDragCounter((c) => c + 1);
                  }}
                  cancelConfirmSignal={dragCounter}
                  onEdit={() =>
                    transaction.type !== "initial"
                      ? router.push(`/transactions/edit?id=${transaction.id}`)
                      : router.push(`/accounts/edit?id=${account?.id}`)
                  }
                  onDelete={
                    transaction.type !== "initial"
                      ? () => handleDeleteTransaction(transaction.id)
                      : undefined
                  }
                  key={transaction.id}
                  confirmDelete
                >
                  <TransactionItem
                    account={account}
                    transaction={transaction}
                    accounts={accounts}
                  />
                </SwipeableElement>
              ))}
            </div>
          ) : (
            ""
          )}
        </div>

        {isLoading ? (
          <div className="h-11.5 w-full rounded-2xl bg-elements-border animate-pulse"></div>
        ) : (
          <Button href={`/transactions?accounts=${accountID}`}>
            مشاهده همه تراکنش‌ها
          </Button>
        )}
      </div>
    );
}
