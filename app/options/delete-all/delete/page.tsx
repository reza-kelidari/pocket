"use client";

import Button from "@/components/Button";
import Info from "@/icons/Info";
import { useRouter } from "next/navigation";
import { JSX, useEffect, useState } from "react";
import { balancesStore } from "@/utility/balance/service/balancesStore";
import { AccountType } from "@/utility/accounts/types";
import { TransactionType } from "@/utility/shared/transactionTypes";
import { getAll } from "@/utility/db/Database";
import { DatabaseStores } from "@/utility/keys/database";
import { SplashShownKey } from "@/utility/keys/sessionStore";
import ProcessingOverlay from "@/components/ProcessingOverlay";

/**
 * Represents the aggregated data fetched for deletion confirmation.
 */
interface DeleteAllData {
  accounts: AccountType[];
  transactions: TransactionType[];
}

/**
 * Return type for the {@link useFetchDeleteAllData} hook.
 */
interface UseFetchDeleteAllDataResult {
  data: DeleteAllData | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Custom hook to manage the state of fetching accounts and transactions.
 * Encapsulates the data fetching logic, error handling, and loading state.
 *
 * @returns An object containing the fetched data, loading status, and potential errors.
 */
function useFetchDeleteAllData(): UseFetchDeleteAllDataResult {
  const [data, setData] = useState<DeleteAllData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;
    const { accountsStore, transactionsStore } = DatabaseStores;

    const fetchData = async () => {
      try {
        const [accs, txs] = await Promise.all([
          getAll<AccountType>(accountsStore),
          getAll<TransactionType>(transactionsStore),
        ]);

        if (!isMounted) return;

        setData({
          accounts: accs ?? [],
          transactions: txs ?? [],
        });
        setError(null);
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  return { data, isLoading, error };
}

/**
 * `DeleteAllConfirm` Component
 *
 * Renders a confirmation screen warning the user about the deletion of all data.
 * It fetches the current count of accounts and transactions to display context to the user.
 * Upon user confirmation, it triggers the deletion API with a step-by-step progress overlay,
 * clears local stores, and redirects to the splash screen to re-initialize the application.
 *
 * @returns The rendered confirmation component, processing overlay, or error message.
 */
export default function DeleteAllConfirm(): JSX.Element | null {
  const router = useRouter();
  const { data, isLoading, error } = useFetchDeleteAllData();

  // UI States
  const [validate, setValidate] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [stepText, setStepText] = useState<string>("");

  /**
   * Handles the deletion of all application data.
   * Updates progress and step text to provide visual feedback via `ProcessingOverlay`.
   *
   * 1. Sends DELETE request to the API.
   * 2. Clears local balance store and session storage.
   * 3. Redirects to the splash screen.
   */
  const handleDeleteAll = async (): Promise<void> => {
    if (!validate || isLoading) return;

    setIsProcessing(true);
    setProgress(10);
    setStepText("در حال ارسال درخواست به سرور...");

    try {
      const res = await fetch("/api/all", { method: "DELETE" });
      if (!res.ok) throw new Error("خطا در ارتباط با سرور");

      setProgress(50);
      setStepText("پاکسازی حافظه محلی...");

      // Clear local stores and session storage
      balancesStore.clear();
      sessionStorage.removeItem(SplashShownKey);

      setProgress(90);
      setStepText("در حال بازنشانی برنامه...");

      // Small delay to ensure the user sees the final progress state before redirect
      await new Promise((resolve) => setTimeout(resolve, 300));
      setProgress(100);

      // Redirect user to splash screen for app re-initialization
      router.replace("/splash");
    } catch (error) {
      console.error("Failed to delete all data:", error);
      setIsProcessing(false);
      setProgress(0);
      setStepText("");
    }
  };

  // Display processing overlay while the deletion request is in flight
  if (isProcessing) {
    return (
      <ProcessingOverlay
        title="در حال پاکسازی اطلاعات"
        progress={progress}
        stepText={stepText}
      />
    );
  }

  if (error) {
    return (
      <div className="text-center text-red p-10">خطا در دریافت اطلاعات...</div>
    );
  }

  // Safely extract values with defaults
  const accountCount = data?.accounts.length ?? 0;
  const transactionCount = data?.transactions.length ?? 0;

  return (
    <div className="flex flex-col items-center justify-center gap-7.5 p-15 h-screen">
      <div className="flex items-center justify-center gap-2">
        <Info className="fill-red" height={30} width={30} />
        <h1 className="text-xl">هشدار</h1>
      </div>

      <p className="text-justify [text-align-last:center] text-xs w-6/7">
        با این‌کار تمام اطلاعات{" "}
        {isLoading ? (
          <span className="inline-block h-3.5 w-14 bg-elements-border rounded-md animate-pulse align-middle" />
        ) : (
          <span className="text-red font-bold">
            {accountCount.toLocaleString("fa-IR")} حساب
          </span>
        )}{" "}
        شامل{" "}
        {isLoading ? (
          <span className="inline-block h-3.5 w-14 bg-elements-border rounded-md animate-pulse align-middle" />
        ) : (
          <span className="text-red font-bold">
            {transactionCount.toLocaleString("fa-IR")} تراکنش
          </span>
        )}{" "}
        حذف میشه؛ مطمئن هستین؟
      </p>

      <div className="grid gap-4">
        <label
          className={`flex items-center justify-center gap-2 text-xs transition-all ${
            isLoading ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
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
      </div>

      <Button
        red={validate && !isLoading}
        secondary={!validate || isLoading}
        disabled={!validate || isLoading}
        onClick={handleDeleteAll}
      >
        حذف همه اطلاعات
      </Button>

      <Button secondary onClick={() => router.back()}>
        لغو
      </Button>
    </div>
  );
}
