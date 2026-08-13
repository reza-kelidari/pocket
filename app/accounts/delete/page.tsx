"use client";

import Button from "@/components/Button";
import Info from "@/icons/Info";
import ProcessingOverlay from "@/components/ProcessingOverlay";
import { AccountColors } from "@/utility/shared/colors";
import { DatabaseStores } from "@/utility/keys/database";
import { deleteItem, getAll, getItem } from "@/utility/db/Database";
import { getAccountBalances } from "@/utility/shared/balancesMethods";
import useBalances from "@/utility/balance/service/useBalances";
import { AccountType } from "@/utility/accounts/types";
import { TransactionType } from "@/utility/shared/transactionTypes";
import { useRouter, useSearchParams } from "next/navigation";
import { JSX, useEffect, useState } from "react";
import { MessageType } from "@/app/message/page";

/**
 * @fileoverview Account deletion confirmation page.
 *
 * Displays a warning to the user about the consequences of deleting an account,
 * specifically detailing how many normal transactions will be permanently deleted
 * and how many transfer transactions will be reassigned to the "Funds in Transit" account.
 *
 * The actual cascading logic (reassigning transfers, deleting normal transactions)
 * is handled securely on the server-side via the DELETE `/api/accounts/[id]` endpoint.
 * This page only handles the UI confirmation and local state synchronization.
 */

/**
 * Aggregated data required to display the deletion confirmation warning.
 */
interface AccountDeleteData {
  /** The account targeted for deletion. */
  account: AccountType | undefined;
  /** Number of non-transfer transactions (income, expense, initial) that will be permanently deleted. */
  normalTransactionsCount: number;
  /** Number of transfer transactions that will be reassigned to the transit account. */
  transferTransactionsCount: number;
  /** The hidden system account used as a fallback for reassigned transfers. */
  transitAccount: AccountType | undefined;
}

/**
 * Return type for the {@link useFetchAccountDeleteData} hook.
 */
interface UseFetchAccountDeleteDataResult {
  data: AccountDeleteData | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Custom hook to fetch and aggregate data for the account deletion confirmation screen.
 *
 * Fetches the target account, all transactions, and all accounts in parallel.
 * It then filters transactions to determine how many will be deleted vs. reassigned,
 * and identifies the hidden transit account for the UI warning message.
 *
 * @param accountID - The UUID of the account to be deleted.
 * @returns An object containing the aggregated data, loading state, and any errors.
 */
function useFetchAccountDeleteData(
  accountID: string,
): UseFetchAccountDeleteDataResult {
  const [data, setData] = useState<AccountDeleteData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!accountID) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    const { accountsStore, transactionsStore } = DatabaseStores;

    const fetchData = async () => {
      try {
        const [targetAccount, allTransactions, allAccounts] = await Promise.all(
          [
            getItem<AccountType>(accountsStore, accountID),
            getAll<TransactionType>(transactionsStore),
            getAll<AccountType>(accountsStore),
          ],
        );

        if (!isMounted) return;

        const relatedTransactions = allTransactions.filter(
          (tx) => tx.credit === accountID || tx.debit === accountID,
        );

        const transferTransactions = relatedTransactions.filter(
          (tx) => tx.type === "transfer",
        );
        const normalTransactions = relatedTransactions.filter(
          (tx) => tx.type !== "transfer",
        );

        // The transit account is identified by being both a default system account and hidden.
        const transitAccount = allAccounts.find(
          (acc) => acc.default === true && acc.hidden === true,
        );

        setData({
          account: targetAccount ?? undefined,
          normalTransactionsCount: normalTransactions.length,
          transferTransactionsCount: transferTransactions.length,
          transitAccount,
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
  }, [accountID]);

  return { data, isLoading, error };
}

/**
 * `AccountDelete` Component
 *
 * Renders a full-screen confirmation dialog warning the user about the
 * cascading effects of deleting an account.
 *
 * Upon confirmation, it triggers the server-side deletion (which handles
 * transaction reassignment and cleanup), updates the local balance state
 * to reflect the server's changes, and navigates back.
 *
 * During the deletion process, a {@link ProcessingOverlay} is displayed with
 * determinate progress tracking across three phases:
 * 1. Deleting the account from the database.
 * 2. Clearing local balance entries.
 * 3. Recalculating balances after transfer reassignments.
 *
 * @returns The rendered confirmation UI, a processing overlay, or `null` if data is missing.
 */
export default function AccountDelete(): JSX.Element | null {
  const searchParams = useSearchParams();
  const accountID = searchParams.get("id") ?? "";
  const router = useRouter();

  const { removeBalance, setBalances } = useBalances();
  const { data, isLoading } = useFetchAccountDeleteData(accountID);

  const [isConfirmed, setIsConfirmed] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [stepText, setStepText] = useState<string>("");

  /**
   * Handles the account deletion process with step-by-step progress tracking.
   *
   * The operation is divided into three phases:
   * 1. **Delete account** (0% → 33%): Sends the DELETE request to the API.
   * 2. **Update balances** (33% → 66%): Removes the deleted account's local balance entry.
   * 3. **Recalculate** (66% → 100%): Refetches all accounts and transactions to
   *    recalculate balances, ensuring the UI reflects the server-side transfer reassignments.
   *
   * After completion, navigates back to the previous screen.
   */
  const handleDelete = async (): Promise<void> => {
    if (!isConfirmed || isLoading || !data?.account) return;

    setIsProcessing(true);
    setProgress(0);
    setStepText("در حال حذف حساب از دیتابیس...");

    try {
      // Phase 1: Trigger server-side deletion and cascading updates
      await deleteItem(DatabaseStores.accountsStore, accountID);
      setProgress(33);
      setStepText("در حال پاک‌سازی موجودی محلی...");

      // Phase 2: Remove local balance for the deleted account
      removeBalance(accountID);
      setProgress(66);
      setStepText("در حال محاسبه مجدد موجودی‌ها...");

      // Phase 3: Refetch data to recalculate balances (transfers are now linked to transit account)
      const { accountsStore, transactionsStore } = DatabaseStores;
      const [finalAccounts, finalTransactions] = await Promise.all([
        getAll<AccountType>(accountsStore),
        getAll<TransactionType>(transactionsStore),
      ]);

      setBalances(getAccountBalances(finalAccounts, finalTransactions));
      setProgress(100);

      const message: MessageType = {
        title: "حذف موفق",
        type: "done",
        message: [`حساب ${data.account.name} با موفقیت حذف شد`],
      };
      sessionStorage.setItem("message", JSON.stringify(message));

      setTimeout(() => {
        router.replace("/message");
      }, 500);
    } catch (error) {
      console.error("Failed to delete account:", error);
      setIsProcessing(false);
      setProgress(0);
      setStepText("");
    }
  };

  if (isProcessing) {
    return (
      <ProcessingOverlay
        title="در حال حذف حساب"
        subtitle="لطفاً تا پایان عملیات صبر کنید..."
        progress={progress}
        stepText={stepText}
      />
    );
  }

  if (!isLoading && !data?.account) return null;

  const account = data?.account;
  const normalCount = data?.normalTransactionsCount ?? 0;
  const transferCount = data?.transferTransactionsCount ?? 0;
  const transitName = data?.transitAccount?.name ?? "وجوه در راه";

  const isActionDisabled = !isConfirmed || isLoading;

  return (
    <div className="grid place-content-center gap-7.5 p-15 h-screen">
      <div className="flex items-center justify-center gap-2">
        <Info className="fill-red" height={30} width={30} />
        <h1 className="text-xl font-bold">هشدار حذف حساب</h1>
      </div>

      <p className="text-justify [text-align-last:center] text-xs leading-6">
        با حذف حساب{" "}
        {isLoading || !account ? (
          <span className="inline-block h-3.5 w-20 bg-elements-border rounded-md animate-pulse align-middle" />
        ) : (
          <span className="font-bold">
            {account.name}{" "}
            <span
              className={`inline-block h-2 w-2 rounded-4xl ${AccountColors[account.color].primary}`}
            />
          </span>
        )}
        ،
        {normalCount > 0 && transferCount > 0 ? (
          <>
            {" "}
            <span className="text-red font-bold">
              {normalCount.toLocaleString("fa-IR")} تراکنش عادی
            </span>{" "}
            برای همیشه حذف شده و{" "}
            <span className="font-bold">
              {transferCount.toLocaleString("fa-IR")} تراکنش انتقال
            </span>{" "}
            به حساب «{transitName}» منتقل می‌شود.
          </>
        ) : normalCount > 0 ? (
          <>
            {" "}
            <span className="text-red font-bold">
              {normalCount.toLocaleString("fa-IR")} تراکنش عادی
            </span>{" "}
            برای همیشه حذف خواهد شد.
          </>
        ) : transferCount > 0 ? (
          <>
            {" "}
            <span className="font-bold">
              {transferCount.toLocaleString("fa-IR")} تراکنش انتقال
            </span>{" "}
            به حساب «{transitName}» منتقل می‌شود.
          </>
        ) : (
          <> هیچ تراکنشی حذف یا منتقل نخواهد شد.</>
        )}
      </p>

      <div className="grid gap-4">
        <label
          className={`flex items-center justify-center gap-2 text-xs transition-all ${
            isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
          }`}
        >
          <input
            type="checkbox"
            checked={isConfirmed}
            disabled={isLoading}
            onChange={(e) => setIsConfirmed(e.target.checked)}
            className="accent-red p-3 ml-1"
          />
          بله، تأیید می‌کنم
        </label>

        <Button
          red={isConfirmed && !isLoading}
          secondary={isActionDisabled}
          disabled={isActionDisabled}
          className="transition-all"
          onClick={handleDelete}
        >
          حذف حساب
        </Button>
      </div>

      <Button secondary onClick={() => router.back()}>
        انصراف
      </Button>
    </div>
  );
}
