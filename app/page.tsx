"use client";

import AccountCard from "@/components/AccountCard";
import Chart from "@/components/Chart";
import QuickAccess from "@/components/QuickAccess";
import Title from "@/components/Title";
import useAccounts from "@/features/store/useAccounts";
import Receive from "@/icons/Receive";
import Send from "@/icons/Send";
import Setting from "@/icons/Setting";
import ThreeDots from "@/icons/ThreeDots";
import Transfer from "@/icons/Transfer";
import { log } from "console";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dispatch, SetStateAction, useEffect, useState } from "react";

export default function Home() {
  const router = useRouter();
  const accounts = useAccounts();
  const [ready, setReady]: [boolean, Dispatch<SetStateAction<boolean>>] =
    useState(false);

  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: "long",
    month: "long",
    day: "numeric",
  };

  useEffect(() => {
    if (accounts.length === 0 || !sessionStorage.getItem("splashShown"))
      router.replace("/splash");
    else setReady(true);
  }, [router]);

  if (ready)
    return (
      <div className="flex flex-col gap-15 p-7.5">
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
          <Title>
            <div className="flex gap-0.5 items-center">
              <div>حساب‌ها</div>
              <Setting height={25} className="fill-primary" />
            </div>
          </Title>
          <div className="flex gap-10 overflow-x-auto snap-x snap-mandatory px-[calc(50vw)] scrollbar-none -m-7.5 mb-0 py-7.5">
            {accounts.map((item) => {
              return (
                <AccountCard
                  key={item.id}
                  id={item.id}
                  name={item.name}
                  color={item.color}
                  lastBalance={item.lastBalance}
                  type={item.type}
                />
              );
            })}
          </div>
        </div>

        <div className="flex gap-16 w-full content-around justify-center">
          <QuickAccess Icon={Receive} link="/newtransaction?type=receive">
            دریافت
          </QuickAccess>
          <QuickAccess Icon={Send} link="/newtransaction?type=pay">
            پرداخت
          </QuickAccess>
          <QuickAccess Icon={Transfer} link="/newtransaction?type=transfer">
            انتقال
          </QuickAccess>
        </div>

        <Chart
          title={"روند موجودی"}
          data={[]}
          timeSelector
          link="/analyze"
          linkTitle="تحلیل و بررسی پیشرفته"
          value={100000000}
        />
      </div>
    );
}
