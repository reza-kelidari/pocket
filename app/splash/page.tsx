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

      sessionStorage.setItem("splashShown", "1")

      router.replace("/");
    }

    load();
  }, []);

  return (
    <div className="flex flex-col place-content-center items-center h-screen relative">
      <Image src="/logo.svg" alt="Logo" height={50} width={50} />
      <br />
      <p className="font-extralight">مدیریت مالی شخصی جیب</p>

      <span className="text-secondary absolute bottom-10 left-1/2 -translate-x-1/2 text-xs">
        درحال بارگذاری ...
      </span>
    </div>
  );
}