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

export default function Accounts() {
  const { getAccounts } = useAccounts();
  const balances = useBalances();
  const router = useRouter();

  const [openItemId, setOpenItemId] = useState<number | null>(null);

  useEffect(() => {
    if (getAccounts().length === 0) {
      router.replace(`/splash`);
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

  const handleEdit = (id: number) => {
    router.push(`/accounts/edit?id=${id}`);
  };

  const handleDelete = (id: number) => {
    alert(`حساب ${id} حذف شود!`);
  };

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
        {getAccounts().map((account) => (
          <SwipeableAccountItem
            key={account.id}
            isOpen={openItemId === account.id}
            onOpenChange={(open) => setOpenItemId(open ? account.id : null)}
            onCloseOthers={() => setOpenItemId(null)}
            onEdit={() => handleEdit(account.id)}
            onDelete={() => handleDelete(account.id)}
          >
            <AccountsListElement
              account={account}
              balances={balances}
              href={`accounts/details?id=${account.id}`}
            />
          </SwipeableAccountItem>
        ))}
      </div>
    </div>
  );
}
