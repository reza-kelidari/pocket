"use client";

import Database from "@/icons/Database";
import { MessageType } from "@/app/message/page";
import { AccountType } from "@/utility/accounts/types";
import useBalances from "@/utility/balance/service/useBalances";
import { getAll } from "@/utility/db/Database";
import { DatabaseStores } from "@/utility/keys/database";
import { getAccountBalances } from "@/utility/shared/balancesMethods";
import { TransactionType } from "@/utility/transactions/types";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export const RESTORE_DATA_KEY = "restore-backup-data";

export default function RestoreProcessingPage() {
  const router = useRouter();
  const { setBalances } = useBalances();

  const [stepText, setStepText] = useState("در حال آماده‌سازی...");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const runRestore = async () => {
      if (!isMounted) return;

      const dataStr = sessionStorage.getItem(RESTORE_DATA_KEY);
      if (!dataStr) {
        router.replace("/options/backup-restore");
        return;
      }

      const backupData = JSON.parse(dataStr);

      try {
        setStepText("در حال ارسال اطلاعات به سرور...");
        setProgress(20);

        // ✅ انجام کل عملیات در یک درخواست در بک‌اند
        const res = await fetch("/api/restore", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(backupData),
        });

        if (!res.ok) {
          throw new Error("خطا در ارتباط با سرور");
        }

        setStepText("به‌روزرسانی موجودی‌ها...");
        setProgress(80);

        const { accountsStore, transactionsStore } = DatabaseStores;
        const finalAccounts = await getAll<AccountType>(accountsStore);
        const finalTxs = await getAll<TransactionType>(transactionsStore);
        setBalances(getAccountBalances(finalAccounts, finalTxs));

        setProgress(100);
        sessionStorage.removeItem(RESTORE_DATA_KEY);

        const message: MessageType = {
          title: "بازیابی موفق",
          type: "done",
          message: [
            `اطلاعات ${backupData.accounts.length.toLocaleString("fa-ir")} حساب و ${backupData.transactions.length.toLocaleString("fa-ir")} تراکنش با موفقیت بازیابی‌شد.`,
          ],
        };
        sessionStorage.setItem("message", JSON.stringify(message));

        setTimeout(() => {
          if (isMounted) router.replace("/message");
        }, 500);
      } catch (error: any) {
        console.error("Restore failed:", error);
        sessionStorage.removeItem(RESTORE_DATA_KEY);
        const message: MessageType = {
          title: "خطا در بازیابی",
          type: "error",
          message: [
            "مشکلی در بازیابی اطلاعات پیش آمد.",
            error.message || "خطای ناشناخته",
          ],
        };
        sessionStorage.setItem("message", JSON.stringify(message));
        if (isMounted) router.replace("/message");
      }
    };

    runRestore();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 bg-white flex flex-col items-center justify-center p-7.5 z-50 animate-fade-in">
      <div className="w-full max-w-md flex flex-col items-center gap-10">
        <div className="h-16 w-16 rounded-4xl bg-primary-background border border-primary-border grid place-content-center">
          <Database
            height={35}
            width={35}
            className="fill-primary animate-pulse"
          />
        </div>

        <div className="text-center">
          <h1 className="text-lg font-bold mb-2">در حال بازیابی اطلاعات</h1>
          <p className="text-secondary text-sm transition-all">{stepText}</p>
        </div>

        <div className="w-full bg-elements-background rounded-2xl h-3 overflow-hidden">
          <div
            className="bg-primary h-full rounded-2xl transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <p className="text-xs text-secondary font-bold">
          {progress.toLocaleString("fa-IR")}٪
        </p>
      </div>
    </div>
  );
}
