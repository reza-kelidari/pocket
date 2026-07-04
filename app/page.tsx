"use client";

import { getAccountsList } from "@/features/accounts/services";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { accountsStore } from "@/features/store/accountsStore";

export default function Splash() {
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const data = await getAccountsList();
      accountsStore.setAccounts(data);

      await new Promise((r) => setTimeout(r, 2000));

      router.replace("/home");
    }

    load();
  }, []);

  return (
    <div className="grid place-content-center h-screen">
      <div className="flex gap-3 items-center">
        <Image src="/logo.svg" alt="Logo" height={50} width={50} />
        <h1 className="text-xl">جیب</h1>
      </div>
      <br />
      <p>مدیریت مالی شخصی</p>
    </div>
  );
}
