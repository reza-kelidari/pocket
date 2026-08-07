"use client";

import Box from "@/components/Box";
import Button from "@/components/Button";
import Description from "@/components/Description";
import NavbarTitle from "@/components/NavbarTitle";
import { AccountType } from "@/utility/accounts/types";
import { BackupType, getBackup } from "@/utility/backup-restore/methods";
import { getAll } from "@/utility/db/Database";
import { DatabaseStores } from "@/utility/keys/database";
import { TagType } from "@/utility/shared/tagTypes";
import { TransactionType } from "@/utility/transactions/types";
import { useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { RESTORE_DATA_KEY } from "./restore/page";

export default function Page() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>("");
  const [backupData, setBackupData] = useState<BackupType>();

  const [accounts, setAccounts] = useState<AccountType[]>([]);
  const [transactions, setTransactions] = useState<TransactionType[]>([]);
  const [tags, setTags] = useState<TagType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { accountsStore, transactionsStore, tagsStore } = DatabaseStores;

  useEffect(() => {
    (async () => {
      try {
        setAccounts(await getAll<AccountType>(accountsStore));
        setTransactions(await getAll<TransactionType>(transactionsStore));
        setTags(await getAll<TagType>(tagsStore));
      } catch (err: any) {
        console.error("Backup load error:", err);
        setError(err.message || "خطا در خواندن اطلاعات از دیتابیس");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [accountsStore, transactionsStore, tagsStore]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (file) {
      const fileReader = new FileReader();
      fileReader.onload = (e) => {
        try {
          const result: BackupType = JSON.parse(fileReader.result as string);
          const backupTime = new Date(result.time).toLocaleDateString("fa-ir");

          setFileName("تاریخ نسخه پشتیبان: " + backupTime);
          setBackupData(result);
        } catch {
          setError("فایل پشتیبان انتخاب شده معتبر نیست.");
        }
      };
      fileReader.readAsText(file);
    }
  }

  function handleFilePicker() {
    fileInputRef.current?.click();
  }

  const handleBackupRestore = () => {
    if (!backupData) return;

    sessionStorage.setItem(RESTORE_DATA_KEY, JSON.stringify(backupData));
    router.push("/options/backup-restore/restore");
  };

  return (
    <div className="p-7.5 grid gap-15">
      <div className="grid gap-7.5">
        <NavbarTitle title="پشتیبان‌گیری و بازیابی" />
      </div>

      {error && (
        <div className="bg-red-background border border-red-border text-red text-xs p-4 rounded-2xl">
          {error}
          <br />
          <span className="text-secondary">
            (لطفاً مطمئن شوید دستورات تغییر نوع ستون‌ها را در دیتابیس اجرا
            کرده‌اید)
          </span>
        </div>
      )}

      <div className="grid gap-10">
        <Box className="gap-5">
          <h1 className="text-sm">پشتیبان‌گیری از اطلاعات</h1>

          <Description>
            باتوجه به این‌که اطلاعات در دستگاه به صورت محلی ذخیره میشه و در هیچ
            سرویس ابری‌ای پشتیبان گرفته نمیشه، توصیه میشه به صورت دوره‌ای نسخه
            پشتیبان تهیه کنین.
          </Description>

          <Description>
            اطلاعاتی که در نسخه پشتیبان ذخیره میشه شامل{" "}
            <b className="text-primary">حساب‌ها</b>،{" "}
            <b className="text-primary">برچسب‌ها</b> و{" "}
            <b className="text-primary">تراکنش‌ها</b> هست.
          </Description>

          <Button
            disabled={isLoading}
            onClick={() => getBackup(accounts, transactions, tags)}
          >
            {isLoading ? "در حال آماده‌سازی..." : "بارگیری نسخه پشتیبان"}
          </Button>
        </Box>

        <Box className="gap-5">
          <h1 className="text-sm">بازیابی اطلاعات</h1>
          <Description>
            اگه یه نسخه پشتیبان دارید، میتونید اون‌رو بارگذاری کنید تا
            اطلاعات‌تون بازیابی بشه؛ درنظر داشته باشید که اگه تا الان اطلاعاتی
            رو در برنامه وارد کردین، این اطلاعات در ابتدا{" "}
            <b className="text-red">حذف</b> و سپس اطلاعات موجود در نسخه پشتیبان
            وارد برنامه میشه.
          </Description>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pbak"
            className="hidden"
            hidden
          />
          <Button secondary onClick={handleFilePicker}>
            {!!fileName ? fileName : "بارگذاری نسخه پشتیبان"}
          </Button>
          <Button
            disabled={!backupData || isLoading}
            onClick={handleBackupRestore}
          >
            بازیابی اطلاعات
          </Button>
        </Box>
      </div>
    </div>
  );
}
