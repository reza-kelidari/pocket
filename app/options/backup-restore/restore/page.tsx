"use client";
import ProcessingOverlay from "@/components/ProcessingOverlay";
import { MessageType } from "@/app/message/page";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAccountsAndTransactions } from "@/utility/shared/useAccountsAndTransactions";

export const RESTORE_DATA_KEY = "restore-backup-data";

export default function RestoreProcessingPage() {
  const router = useRouter();
  const fetchAll = useAccountsAndTransactions();
  const [stepText, setStepText] = useState("در حال آماده‌سازی...");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const runRestore = async () => {
      if (!isMounted) return;
      setProgress(1);
      const dataStr = sessionStorage.getItem(RESTORE_DATA_KEY);
      if (!dataStr) {
        router.replace("/options/backup-restore");
        return;
      }
      setProgress(5);
      const backupData = JSON.parse(dataStr);
      try {
        setStepText("در حال ارسال اطلاعات به سرور...");
        setProgress(20);
        const res = await fetch("/api/restore", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(backupData),
        });
        setProgress(40);
        if (!res.ok) throw new Error("خطا در ارتباط با سرور");

        setStepText("به‌روزرسانی موجودی‌ها...");
        setProgress(70);
        await fetchAll();
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
        const message: MessageType = {
          title: "خطا در بازیابی",
          type: "error",
          message: [
            "مشکلی در بازیابی اطلاعات پیش آمد.",
            error.message || "خطای ناشناخته",
            "می‌توانید دوباره تلاش کنید.",
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
    <ProcessingOverlay
      title="در حال بازیابی اطلاعات"
      progress={progress}
      stepText={stepText}
    />
  );
}
