"use client";

import Button from "@/components/Button";
import useAccounts from "@/features/store/useAccounts";
import Link from "next/link";
import { useEffect } from "react";

export default function Notfound() {
  const [accounts] = useAccounts();

  useEffect(() => {
    console.log(accounts);
  }, []);

  return (
    <div className="flex flex-col place-content-center items-center h-screen relative p-7.5">
      <h1 className="text-lg">صفحه پیدا نشد!</h1>
      <br />
      <Button link="/">بریم خونه</Button>
    </div>
  );
}
