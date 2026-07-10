"use client";

import Button from "@/components/Button";
import Info from "@/icons/Info";
import { AccountColors, PrimaryColors } from "@/utility/colors";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { deleteItem, getAll, getItem, putItem } from "@/utility/db/Database";
import { TransactionType } from "@/utility/transactions/types";
import { DatabaseStores } from "@/utility/keys/database";
import useBalances from "@/utility/balance/service/useBalances";
import { TagType } from "@/utility/tags/type";

export default function TagDelete() {
  const searchParams = useSearchParams();
  const tagID = Number(searchParams.get("id") ?? "0");
  const router = useRouter();
  const { tagsStore, transactionsStore } = DatabaseStores;

  const [tag, setTag] = useState<TagType>();
  const [transactionsCount, setTransactionsCount] = useState("۰");

  const [validate, setValidate] = useState(false);

  useEffect(() => {
    (async () => {
      setTag((await getItem<TagType>(tagsStore, tagID)) ?? undefined);

      setTransactionsCount(
        (await getAll<TransactionType>(transactionsStore))
          .filter((item) => item.tag === tagID)
          .length.toLocaleString("fa-IR"),
      );
    })();
  }, [tagID, tagsStore, transactionsStore, router]);

  const handleDelete = async () => {
    if (!validate) return;

    const transactions = (await getAll(transactionsStore)) as TransactionType[];
    const toChange = transactions.filter((t) => t.tag === tagID);
    for (const tx of toChange) {
      await putItem(transactionsStore, { ...tx, tag: undefined });
    }

    await deleteItem(tagsStore, tagID);

    router.back();
  };

  if (!tag) return null;

  return (
    <div className="grid place-content-center gap-7.5 p-15 h-screen">
      <div className="flex items-center justify-center gap-2">
        <Info className="fill-red" height={30} width={30} />
        <h1 className="text-xl">هشدار</h1>
      </div>

      <p className="text-justify [text-align-last:center] text-xs">
        با این‌کار برچسب <span className="font-bold">{tag.name}</span> که در{" "}
        {transactionsCount} تراکنش استفاده شده{" "}
        <span className="text-red">حذف</span> میشه؛ مطمئن هستین؟ (برچسب{" "}
        <span className="font-bold">{tag.name}</span> از همه‌ی این تراکنش‌ها
        برداشته میشه)
      </p>

      <div className="grid gap-4">
        <label className="flex items-center justify-center gap-2 cursor-pointer text-xs">
          <input
            type="checkbox"
            checked={validate}
            onChange={(e) => setValidate(e.target.checked)}
            className="accent-red p-3 ml-1"
          />
          بله، مطمئن هستم
        </label>

        <Button
          red={validate}
          secondary={!validate}
          disabled={!validate}
          className="transition-all"
          onClick={handleDelete}
        >
          حذف حساب
        </Button>
      </div>

      <Button secondary onClick={() => router.back()}>
        لغو
      </Button>
    </div>
  );
}
