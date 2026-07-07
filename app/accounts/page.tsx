"use client";

import Capsule from "@/components/Capsule";
import AccountsListElement from "../../components/AccountsListElement";
import NavbarTitle from "@/components/NavbarTitle";
import { useAccounts } from "@/utility/accounts/service/useAccounts";
import useBalances from "@/utility/balance/service/useBalances";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Left from "@/icons/Left";
import SwipeableAccountItem from "@/components/SwipableAccountElement";
import Right from "@/icons/Right";

export default function Accounts() {
  const { getAccounts } = useAccounts();
  const {getBalances} = useBalances();
  const router = useRouter();
  const [showHint, setShowHint] = useState(true);
  const [openItemId, setOpenItemId] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowHint(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (getAccounts().length === 0) {
      router.replace(`/splash?from=/accounts`);
    }
  }, [getAccounts, router]);

  useEffect(() => {
    if (openItemId === null) return;

    const handleCloseAll = () => setOpenItemId(null);

    const timer = setTimeout(() => {
      window.addEventListener("mouseup", handleCloseAll);
      window.addEventListener("touchend", handleCloseAll);
    }, 0);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("mouseup", handleCloseAll);
      window.removeEventListener("touchend", handleCloseAll);
    };
  }, [openItemId]);

  if (getAccounts().length === 0) return null;

  return (
    <div className="p-7.5 grid gap-15">
      <div className="grid gap-7.5">
        <NavbarTitle title="حساب‌ها">
          <Capsule Icon={Left} href="/accounts/add">
            حساب جدید
          </Capsule>
        </NavbarTitle>
      </div>

      <div className="grid gap-5">
        <div
          className={`absolute top-16 z-20 right-1/2 translate-x-1/2 w-screen p-7.5 transition-all duration-700 ${showHint ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-secondary flex items-center gap-1">
              <Right className="fill-secondary" height={15} width={15} />
              برای حذف به راست بکشید
            </span>

            <span className="text-[10px] text-secondary flex items-center gap-1">
              برای ویرایش به چپ بکشید
              <Left className="fill-secondary" height={15} width={15} />
            </span>
          </div>
        </div>

        {getAccounts().map((account) => (
          <SwipeableAccountItem
            key={account.id}
            isOpen={openItemId === account.id}
            onOpenChange={(open) => setOpenItemId(open ? account.id : null)}
            onCloseOthers={() => setOpenItemId(null)}
            onEdit={() => router.push(`/accounts/edit?id=${account.id}`)}
            onDelete={() => {
              router.push(`/accounts/delete?id=${account.id}`);
            }}
            defaultAccount={account.default}
          >
            <AccountsListElement
              account={account}
              balances={getBalances()}
              href={`accounts/details?id=${account.id}`}
            />
          </SwipeableAccountItem>
        ))}
      </div>
    </div>
  );
}
