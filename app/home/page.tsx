"use client";

import AccountCard from "@/components/AccountCard";
import Title from "@/components/Title";
import { accountsStore } from "@/features/store/accountsStore";
import useAccounts from "@/features/store/useAccounts";
import Setting from "@/icons/Setting";
import ThreeDots from "@/icons/ThreeDots";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const router = useRouter();
  const accounts = useAccounts()

  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: "long",
    month: "long",
    day: "numeric",
  };

  useEffect(() => {
    if (accountsStore.getAccounts().length === 0) {
      router.replace("/");
    }
  }, []);

  return (
    <div className="flex flex-col gap-15 p-7.5">
      <header className="flex justify-between p-2.5">
        <div className="flex w-7.5"></div>
        <h3 className="text-text-secondary text-center">
          {new Date().toLocaleDateString("fa-IR", dateOptions)}
        </h3>
        <ThreeDots className="fill-primary" />
      </header>

      <div className="grid gap-7.5">
        <Title>
          <div className="flex gap-0.5 items-center">
            <div>حساب‌ها</div>
            <Setting height={25} className="fill-primary" />
          </div>
        </Title>
        <div className="flex gap-10 overflow-x-auto snap-x snap-mandatory px-[calc(50vw)] scrollbar-none -m-7.5 py-7.5">
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
    </div>
  );
}
