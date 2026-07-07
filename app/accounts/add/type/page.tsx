"use client";

import NavbarTitle from "@/components/NavbarTitle";
import { AccountTypes } from "@/utility/accounts/constants";
import { PrimaryColors } from "@/utility/colors";
import { useRedirect } from "@/utility/redirect/service/useRedirect";
import Link from "next/link";
import { useEffect } from "react";
import { CREATE_ACCOUNT_KEY } from "../page";
import { AccountTypesType } from "@/utility/accounts/types";

export default function Page() {
  const { add, back } = useRedirect();

  const data = JSON.parse(sessionStorage.getItem(CREATE_ACCOUNT_KEY)!);

  useEffect(() => {
    add(window.location.pathname);
  }, [add]);

  return (
    <div className="p-7.5 grid gap-15 w-screen overflow-hidden">
      <div className="grid gap-7.5">
        <NavbarTitle title="نوع حساب" disabled />
      </div>

      <div className="grid gap-5">
        {Object.keys(AccountTypes).map((item, index) => (
          <Link
            href="/accounts/add"
            key={index}
            onClick={() => {
              back();
              sessionStorage.setItem(
                CREATE_ACCOUNT_KEY,
                JSON.stringify({ ...data, type: item }),
              );
            }}
            className={`${PrimaryColors.secondary.box} px-5 py-4 rounded-2xl text-sm flex items-center justify-between`}
          >
            {AccountTypes[item as AccountTypesType].name}
          </Link>
        ))}
      </div>
    </div>
  );
}
