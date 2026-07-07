"use client";

import NavbarTitle from "@/components/NavbarTitle";
import { useSearchParams } from "next/navigation";

export default function TransactionEdit() {
  const searchParams = useSearchParams();
  const txID = searchParams.get("id");

  return (
    <div className="p-7.5 grid gap-15">
      <div className="grid gap-7.5">
        <NavbarTitle title="ویرایش تراکنش" />
      </div>

      <div>{txID}</div>
    </div>
  );
}