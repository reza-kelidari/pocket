"use client";

import NavbarTitle from "@/components/NavbarTitle";
import { useRedirect } from "@/utility/redirect/service/useRedirect";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function TransactionEdit() {
  const searchParams = useSearchParams();
  const txID = searchParams.get("id");
  const { add } = useRedirect();

  useEffect(() => {
    add(window.location.pathname + window.location.search);
  }, [add]);

  return (
    <div className="p-7.5 grid gap-15">
      <div className="grid gap-7.5">
        <NavbarTitle title="ویرایش تراکنش" />
      </div>

      {txID}
    </div>
  );
}
