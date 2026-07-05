"use client";

import AccountCard from "@/components/AccountCard";
import Button from "@/components/Button";
import Chart from "@/components/Chart";
import QuickAccess from "@/components/QuickAccess";
import Title from "@/components/SectionTitle";
import TransactionItem from "@/components/TransactionItem";
import useAccounts from "@/features/accounts/service/useAccounts";
import { getBalancesMap, getTotalBalances } from "@/features/balance/selector";
import useBalances from "@/features/balance/service/useBalances";
import { BalancesMapType } from "@/features/balance/types";
import { getLatestTransaction } from "@/features/transactions/selector";
import { IconComponent } from "@/icons/types";
import useTransactions from "@/features/transactions/service/useTransactions";
import Receive from "@/icons/Receive";
import Send from "@/icons/Send";
import Setting from "@/icons/Setting";
import ThreeDots from "@/icons/ThreeDots";
import Transfer from "@/icons/Transfer";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const router = useRouter();
  const accounts = useAccounts();
  const transactions = useTransactions();
  const balances = useBalances();

  const splashGuard =
    !accounts.length || !sessionStorage.getItem("splashShown");

  useEffect(() => {
    splashGuard && router.replace("/splash");
  }, [accounts, router]);

  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: "long",
    month: "long",
    day: "numeric",
  };

  const balancesMap: BalancesMapType = getBalancesMap(balances);
  const totalBalance: number = getTotalBalances(balancesMap);

  const quickAccessList: { name: string; link: string; icon: IconComponent }[] =
    [
      { name: "دریافت", link: "/newtransaction?type=debit", icon: Receive },
      { name: "پرداخت", link: "/newtransaction?type=credit", icon: Send },
      { name: "انتقال", link: "/newtransaction?type=transfer", icon: Transfer },
    ];

  if (splashGuard) return null;

  return (
    <div className="flex flex-col gap-15 p-7.5 pb-15">
      <header className="flex justify-between p-2.5">
        <div className="flex w-7.5"></div>
        <h3 className="text-secondary text-center">
          {new Date().toLocaleDateString("fa-IR", dateOptions)}
        </h3>
        <Link href="/options">
          <ThreeDots className="fill-primary" height={30} width={30} />
        </Link>
      </header>

      <div className="grid gap-7.5">
        <Link href="/accounts" className="w-fit">
          <Title>
            <div className="flex gap-0.5 items-center">
              <div>حساب‌ها</div>
              <Setting height={25} className="fill-primary" />
            </div>
          </Title>
        </Link>
        <div className="flex gap-10 overflow-x-auto snap-x snap-mandatory px-[calc(50vw)] scrollbar-none -m-7.5 mb-0 py-7.5">
          {accounts.map((item) => {
            return (
              <AccountCard
                key={item.id}
                id={item.id}
                name={item.name}
                color={item.color}
                lastBalance={balancesMap.get(item.id) ?? 0}
                type={item.type}
              />
            );
          })}
        </div>
      </div>

      <div className="flex gap-16 w-full content-around justify-center">
        {quickAccessList.map((item) => (
          <QuickAccess
            key={quickAccessList.indexOf(item)}
            Icon={item.icon}
            link={item.link}
          >
            {item.name}
          </QuickAccess>
        ))}
      </div>

      <Chart
        title={"روند موجودی"}
        data={balances}
        timeSelector
        link="/analyze"
        linkTitle="تحلیل و بررسی پیشرفته"
        balance={totalBalance}
      />

      <div className="grid gap-7.5">
        <Title>
          <div className="flex gap-0.5 items-center">
            <div>تراکنش‌های اخیر</div>
          </div>
        </Title>

        <div className="flex flex-col w-full gap-2.5">
          {getLatestTransaction(transactions, 5).map((transaction) => {
            let transactionAccountID: number;
            let transactionName: string;

            if (transaction.type === "credit")
              transactionAccountID = transaction.credit;
            else transactionAccountID = transaction.debit;

            transactionName =
              transaction.type === "initial"
                ? "موجودی اولیه"
                : transaction.name;

            return (
              <TransactionItem
                key={transaction.id}
                name={transactionName}
                account={transactionAccountID}
                time={transaction.time}
                value={transaction.value}
                type={transaction.type}
              />
            );
          })}
        </div>
        <Button link="/transactions">مشاهده همه تراکنش‌ها</Button>
      </div>
    </div>
  );
}
