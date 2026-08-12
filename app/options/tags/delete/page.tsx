"use client";

import Button from "@/components/Button";
import Info from "@/icons/Info";
import { useRouter, useSearchParams } from "next/navigation";
import { JSX, useEffect, useState } from "react";
import { deleteItem, getAll, getItem, putItem } from "@/utility/db/Database";
import { TransactionType } from "@/utility/shared/transactionTypes";
import { DatabaseStores } from "@/utility/keys/database";
import { TagType } from "@/utility/shared/tagTypes";

/**
 * Represents the aggregated data fetched for single tag deletion confirmation.
 */
interface TagDeleteData {
  tag: TagType | undefined;
  affectedTransactions: TransactionType[];
  transactionsCount: number;
}

/**
 * Custom hook to manage the state of fetching a specific tag and its associated transactions.
 */
function useFetchTagDeleteData(tagID: string): {
  data: TagDeleteData | null;
  isLoading: boolean;
  error: Error | null;
} {
  const [data, setData] = useState<TagDeleteData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!tagID) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    const { tagsStore, transactionsStore } = DatabaseStores;

    const fetchData = async () => {
      try {
        const [tag, txs] = await Promise.all([
          getItem<TagType>(tagsStore, tagID),
          getAll<TransactionType>(transactionsStore),
        ]);

        if (!isMounted) return;

        const affectedTxs = txs.filter((item) => item.tag === tagID);

        setData({
          tag: tag ?? undefined,
          affectedTransactions: affectedTxs,
          transactionsCount: affectedTxs.length,
        });
        setError(null);
      } catch (err) {
        if (!isMounted) return;
        setError(err as Error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [tagID]);

  return { data, isLoading, error };
}

/**
 * TagDelete Component
 *
 * Renders a confirmation screen for deleting a specific tag.
 * Removing a tag also strips it from all associated transactions.
 */
export default function TagDelete(): JSX.Element | null {
  const searchParams = useSearchParams();
  const tagID = searchParams.get("id") ?? "";
  const router = useRouter();
  const { tagsStore, transactionsStore } = DatabaseStores;

  const { data, isLoading } = useFetchTagDeleteData(tagID);

  const [validate, setValidate] = useState<boolean>(false);

  /**
   * Handles the deletion of the tag and strips it from all affected transactions.
   */
  const handleDelete = async (): Promise<void> => {
    if (!validate || isLoading || !data?.tag) return;

    try {
      // Strip the tag from all affected transactions
      for (const tx of data.affectedTransactions) {
        await putItem(transactionsStore, { ...tx, tag: undefined });
      }

      // Delete the tag itself
      await deleteItem(tagsStore, tagID);

      router.back();
    } catch (error) {
      console.error("Failed to delete tag:", error);
    }
  };

  if (!isLoading && !data?.tag) return null;

  const tag = data?.tag;
  const transactionsCount = data?.transactionsCount ?? 0;

  return (
    <div className="grid place-content-center gap-7.5 p-15 h-screen">
      <div className="flex items-center justify-center gap-2">
        <Info className="fill-red" height={30} width={30} />
        <h1 className="text-xl">هشدار</h1>
      </div>

      <p className="text-justify [text-align-last:center] text-xs leading-6">
        با این‌کار برچسب{" "}
        {isLoading || !tag ? (
          <span className="inline-block h-3.5 w-20 bg-elements-border rounded-md animate-pulse align-middle" />
        ) : (
          <span className="font-bold">{tag.name}</span>
        )}{" "}
        که در{" "}
        {isLoading ? (
          <span className="inline-block h-3.5 w-12 bg-elements-border rounded-md animate-pulse align-middle" />
        ) : (
          <span className="text-red font-bold whitespace-nowrap">
            {transactionsCount.toLocaleString("fa-IR")} تراکنش
          </span>
        )}{" "}
        استفاده شده <span className="text-red">حذف</span> میشه؛ مطمئن هستین؟
        (برچسب{" "}
        {isLoading || !tag ? (
          <span className="inline-block h-3.5 w-20 bg-elements-border rounded-md animate-pulse align-middle" />
        ) : (
          <span className="font-bold">{tag.name}</span>
        )}{" "}
        از همه‌ی این تراکنش‌ها برداشته میشه)
      </p>

      <div className="grid gap-4">
        <label
          className={`flex items-center justify-center gap-2 text-xs transition-all ${
            isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
          }`}
        >
          <input
            type="checkbox"
            checked={validate}
            disabled={isLoading}
            onChange={(e) => setValidate(e.target.checked)}
            className="accent-red p-3 ml-1"
          />
          بله، مطمئن هستم
        </label>

        <Button
          red={validate && !isLoading}
          secondary={!validate || isLoading}
          disabled={!validate || isLoading}
          className="transition-all"
          onClick={handleDelete}
        >
          حذف برچسب
        </Button>
      </div>

      <Button secondary onClick={() => router.back()}>
        لغو
      </Button>
    </div>
  );
}
