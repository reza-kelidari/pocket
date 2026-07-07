"use client";

import NavbarTitle from "@/components/NavbarTitle";
import { AccountTypes } from "@/utility/accounts/constants";
import { PrimaryColors } from "@/utility/colors";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CREATE_ACCOUNT_KEY } from "../page";
import { AccountTypesType } from "@/utility/accounts/types";

export default function Page() {
  const router = useRouter();
  const data = JSON.parse(sessionStorage.getItem(CREATE_ACCOUNT_KEY) || "{}");

  const handleSelectType = (item: string) => {
    sessionStorage.setItem(
      CREATE_ACCOUNT_KEY,
      JSON.stringify({ ...data, type: item }),
    );
    // برگشت به صفحه قبلی (همان فرم افزودن حساب)
    router.back();
  };

  return (
    <div className="p-7.5 grid gap-15 w-screen overflow-hidden">
      <div className="grid gap-7.5">
        <NavbarTitle title="نوع حساب" />
      </div>

      <div className="grid gap-5">
        {Object.keys(AccountTypes).map((item, index) => (
          <Link
            href="/accounts/add"
            key={index}
            onClick={(e) => {
              e.preventDefault(); // جلوگیری از رفتن مستقیم با لینک
              handleSelectType(item);
            }}
            className={`${PrimaryColors.secondary.box} px-5 py-4 rounded-2xl text-sm flex items-center justify-between cursor-pointer`}
          >
            {AccountTypes[item as AccountTypesType].name}
          </Link>
        ))}
      </div>
    </div>
  );
}