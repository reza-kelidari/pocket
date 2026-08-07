"use client";

import Box from "@/components/Box";
import Button from "@/components/Button";
import NavbarTitle from "@/components/NavbarTitle";
import { DatabaseStores } from "@/utility/keys/database";
import { getAll } from "@/utility/db/Database";
import { AccountType } from "@/utility/accounts/types";
import { TagType } from "@/utility/shared/tagTypes";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Description from "@/components/Description";
import { generateExcelTemplate } from "@/utility/import/generateTemplate";
import { importDataToDatabase } from "@/utility/import/importToDatabase";
import { parseUploadedExcel } from "@/utility/import/parseExcelFile";
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
  const [isImporting, setIsImporting] = useState(false); // ✅ استیت لودینگ
  const [fileError, setFileError] = useState<string | null>(null);

  useEffect(() => {
    async function loadInitial() {
      const accs = await getAll<AccountType>(DatabaseStores.accountsStore);
      accs.sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
      setExistingAccounts(accs);

      const tags = await getAll<TagType>(DatabaseStores.tagsStore);
      tags.sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
      setExistingTags(tags);
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
        const parsedData = await parseUploadedExcel(
          buffer,
          existingAccounts,
          existingTags,
        );
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

    try {
      await importDataToDatabase(
        previewData,
        existingAccounts,
        existingTags,
        router,
      );
    } catch (error) {
      setIsImporting(false);
      setFileError("خطایی در هنگام ورود اطلاعات رخ داد.");
    }
  };

  if (isImporting) {
    return (
      <ProcessingOverlay
        title="در حال وارد کردن اطلاعات"
        subtitle="لطفاً تا پایان عملیات صبر کنید..."
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
