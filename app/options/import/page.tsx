"use client";

import Box from "@/components/Box";
import Button from "@/components/Button";
import NavbarTitle from "@/components/NavbarTitle";
import { DatabaseStores } from "@/utility/keys/database";
import { getAll } from "@/utility/db/Database";
import { AccountType } from "@/utility/accounts/types";
import { TagType } from "@/utility/shared/tagTypes";
import { TransactionType } from "@/utility/shared/transactionTypes";
import { getAccountBalances } from "@/utility/shared/balancesMethods";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Description from "@/components/Description";
import { generateExcelTemplate } from "@/utility/import/generateTemplate";
import { importDataToDatabase } from "@/utility/import/importToDatabase";
import { parseExcelFile } from "@/utility/import/parseExcelFile";
import PreviewSection from "./components/ShowDataPreview";
import { PreviewData } from "@/utility/import/excelConstants";
import ProcessingOverlay from "@/components/ProcessingOverlay";

export default function ImportExcelPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [existingAccounts, setExistingAccounts] = useState<AccountType[]>([]);
  const [existingTags, setExistingTags] = useState<TagType[]>([]);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [stepText, setStepText] = useState("");

  useEffect(() => {
    async function loadInitial() {
      setExistingAccounts(
        await getAll<AccountType>(DatabaseStores.accountsStore),
      );
      setExistingTags(await getAll<TagType>(DatabaseStores.tagsStore));
    }
    loadInitial();
  }, []);

  const handleDownloadTemplate = async () => {
    await generateExcelTemplate(existingAccounts, existingTags);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError(null);
    setPreviewData(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const buffer = event.target?.result as ArrayBuffer;
      try {
        const parsedData = await parseExcelFile(
          buffer,
          existingAccounts,
          existingTags,
        );

        // ─── افزودن موجودی فعلی هر حساب به finalBalance ───
        const allTxs = await getAll<TransactionType>(
          DatabaseStores.transactionsStore,
        );
        const balances = getAccountBalances(existingAccounts, allTxs);
        const balanceMap = new Map<string, number>();
        for (const b of balances) {
          const lastBalance = b.history?.at(-1)?.balance ?? 0;
          balanceMap.set(b.id, lastBalance);
        }
        for (const acc of parsedData.accounts) {
          if (!acc.isNew && acc.id) {
            const existingBalance = balanceMap.get(acc.id) ?? 0;
            acc.finalBalance += existingBalance;
          }
        }

        setPreviewData(parsedData);
      } catch (err: any) {
        setFileError(err.message || "خطایی در پردازش فایل رخ داد.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    if (!isConfirmed || !previewData) return;
    setIsImporting(true);
    setProgress(0);
    setStepText("در حال شروع فرآیند ورود اطلاعات...");
    try {
      const result = await importDataToDatabase(
        previewData,
        existingAccounts,
        existingTags,
        (p, s) => {
          setProgress(p);
          setStepText(s);
        },
      );
      // ─── اول overlay رو unmount می‌کنیم، بعد ناوبری ───
      setIsImporting(false);
      sessionStorage.setItem("message", JSON.stringify(result));
      router.replace("/message");
    } catch (error) {
      setIsImporting(false);
      setProgress(0);
      setStepText("");
      setFileError("خطایی در هنگام ورود اطلاعات رخ داد.");
    }
  };

  if (isImporting) {
    return (
      <ProcessingOverlay
        title="در حال وارد کردن اطلاعات"
        subtitle="لطفاً تا پایان عملیات صبر کنید..."
        progress={progress}
        stepText={stepText}
      />
    );
  }

  return (
    <div className="p-7.5 grid gap-15 w-full max-w-full overflow-hidden">
      <NavbarTitle title="ورود اطلاعات از اکسل" />

      <div className="grid gap-5">
        <Box>
          <h3 className="text-sm font-bold">مرحله ۱: دانلود فایل نمونه</h3>
          <Description>
            فایل اکسل نمونه را دانلود کنید. در صفحه اول، حساب‌ها و برچسب‌های
            فعلی شما همراه با کد آن‌ها وجود دارد. موارد جدید را بدون کد در
            انتهای لیست اضافه کنید.
          </Description>
          <Button onClick={handleDownloadTemplate}>دانلود فایل نمونه</Button>
        </Box>

        <Box>
          <h3 className="text-sm font-bold">مرحله ۲: آپلود فایل تکمیل شده</h3>
          <input
            type="file"
            accept=".xlsx, .xls"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button secondary onClick={() => fileInputRef.current?.click()}>
            انتخاب فایل اکسل
          </Button>
          {fileError && (
            <div className="mt-4 text-red-500 font-bold text-sm">
              {fileError}
            </div>
          )}
        </Box>
      </div>

      {previewData && (
        <PreviewSection
          previewData={previewData}
          isConfirmed={isConfirmed}
          setIsConfirmed={setIsConfirmed}
          isImporting={isImporting}
          handleImport={handleImport}
        />
      )}
    </div>
  );
}
