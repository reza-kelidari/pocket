"use client";

import Capsule from "@/components/Capsule";
import AccountsListElement from "../../components/AccountsListElement";
import NavbarTitle from "@/components/NavbarTitle";
import { useAccounts } from "@/utility/accounts/service/useAccounts";
import useBalances from "@/utility/balance/service/useBalances";
import { useRedirect } from "@/utility/redirect/service/useRedirect";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Left from "@/icons/Left";

export default function Accounts() {
  const { getAccounts } = useAccounts();
  const balances = useBalances();
  const router = useRouter();
  const { add } = useRedirect();

  useEffect(() => {
    if (getAccounts().length === 0) router.replace(`/splash`);
  }, []);

  useEffect(() => {
    add(window.location.pathname + window.location.search);
  }, [add]);

  if (getAccounts().length === 0) return;

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
          <AccountsListElement
            account={account}
            balances={balances}
            key={account.id}
            href={`accounts/details?id=${account.id}`}
          />
        ))}
      </div>
    </div>
  );
}
